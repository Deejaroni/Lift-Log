// UI audit: opens the app at phone size in light and dark with the sample data in tests/fixtures/demo.js (plus a
// first launch, long names and big numbers, and larger text), screenshots each screen and measures what the design
// rules in CLAUDE.md ask for, how the screens hold together, how they feel to use, and what changed since last run.
// Run: npm run audit:ui   Output: tools/out/ui-audit/index.html (report) and findings.json.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { inspect, snapRects, movedRects, timeTap, drawReach, diffImages } from "./audit/page.mjs";
import { SCENARIOS } from "./audit/scenarios.mjs";
import { wording, consistency, writeReport } from "./audit/report.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out", "ui-audit"), SHOTS = path.join(OUT, "shots");
const W = 390, H = 844, MIN_TAP = 40, GUTTER = 16, SLOW = 4;
// A fixed day (a Wednesday, like the tests), so screenshots only change when the app does.
const TODAY = "2026-03-04";

// The controls used most during a workout, for the thumb-reach map. FREQUENT ones should be easy to reach.
const ACTIONS = [["Log set", "#save"], ["Weight − / +", '[data-step="weight"]'], ["Reps − / +", '[data-step="reps"]'], ["Quick add", "#quick-add button"],
  ["Rest", "#rest-start"], ["Exercise search", "#exercise-search"], ["Start plan", "#plan-today button"], ["Tabs", "nav.tabs button"]];
const FREQUENT = new Set(["Log set", "Weight − / +", "Reps − / +", "Quick add", "Rest"]);
const zoneOf = (x, y) => { const fx = x / W, fy = y / H; if (fy < .3 || (fy < .45 && fx < .4)) return "hard"; if (fy >= .55 && !(fx < .18 && fy > .9)) return "easy"; return "stretch"; };

// A tiny static server for the repo (no caching, like npm run serve).
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

// ---------- the screens ----------
const tab = t => async page => { await page.click(`nav.tabs [data-tab="${t}"]`); };
const SCREENS = [
  ["Log: top", tab("log")],
  ["Log: form", async page => { await tab("log")(page); await page.evaluate(() => { const s = document.querySelector("#save").getBoundingClientRect(), nav = document.querySelector("nav.tabs").getBoundingClientRect(); scrollBy(0, s.bottom - (nav.top - 16)); }); }],
  ["Log: today's sets", async page => { await tab("log")(page); await page.locator("#day-list").scrollIntoViewIfNeeded(); }],
  ["Exercise picker", async page => { await tab("log")(page); await page.click("#exercise-search"); await page.fill("#exercise-search", ""); }],
  ["Search results", async page => { await tab("log")(page); await page.fill("#exercise-search", "bench"); }],
  ["Exercise sheet", async page => { await tab("log")(page); await page.fill("#exercise-search", "Barbell bench press — flat");
    await page.click('#ex-results [data-name="Barbell bench press — flat"]'); await page.click("#ex-chosen-text"); await page.locator("#exsheet").waitFor(); }],
  ["Plan", tab("plan")],
  ["History", async page => { await tab("history")(page); const more = page.locator("#history [data-more]").first(); if (await more.count()) await more.click(); }],
  ["Progress: top", tab("progress")],
  ["Progress: charts", async page => { await tab("progress")(page); await page.locator("#prog-ex").scrollIntoViewIfNeeded(); }],
  ["Settings", async page => { await tab("log")(page); await page.click("#open-settings"); await page.locator("#settings").waitFor(); }],
];
const REACH = ["Log: top", "Log: form"];

// Reduce motion is on, so the moving pictures hold still and screenshots compare cleanly between runs;
// anything that still moves is a finding.
async function open(browser, sc, scheme, { motion = "reduce" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: scheme, reducedMotion: motion, serviceWorkers: "block", deviceScaleFactor: 2 });
  await ctx.clock.setFixedTime(new Date(`${TODAY}T12:00:00Z`));
  await ctx.addInitScript(([seed, zoom]) => {
    if (zoom) { const z = () => document.documentElement && (document.documentElement.style.zoom = zoom); z(); document.addEventListener("DOMContentLoaded", z); }
    if (sessionStorage.getItem("seeded")) return; sessionStorage.setItem("seeded", "1"); localStorage.clear();
    for (const [k, v] of [["entries", seed.entries], ["settings", seed.settings], ["prefs", seed.prefs]]) if (v) localStorage.setItem(`liftlog.${k}.v1`, JSON.stringify(v));
  }, [sc.seed(TODAY), sc.zoom || 0]);
  const page = await ctx.newPage(), errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  return { ctx, page, errors };
}
async function load(page, sc) {
  await page.goto(BASE);
  // A loaded plan, so the Plan tab and the Today ring have content.
  if (sc.plan !== false) { await page.evaluate(async () => { const { loadTemplate } = await import("./js/plan.js"), { saveSettings } = await import("./js/state.js"); loadTemplate("ppl"); await saveSettings(); }); await page.reload(); }
  await page.evaluate(() => document.fonts.ready);
}
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- checks on the source ----------
// Colors outside the token blocks in css/app.css, and inline colors and browser pop-ups in the page and modules.
function sourceChecks() {
  const out = [], css = fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8").split("\n");
  let inTokens = false;
  css.forEach((l, i) => {
    if (/^:root|prefers-color-scheme/.test(l)) inTokens = true;
    else if (inTokens && /^}/.test(l)) { inTokens = false; return; }
    if (!inTokens && /#[0-9a-f]{3,8}\b|rgba?\(/i.test(l)) out.push(`css/app.css:${i + 1} uses a color that isn't a token: ${l.trim().slice(0, 90)}`);
  });
  for (const f of ["index.html", ...fs.readdirSync(path.join(ROOT, "js")).filter(f => f.endsWith(".js") && f !== "exercise-library.js").map(f => `js/${f}`)])
    fs.readFileSync(path.join(ROOT, f), "utf8").split("\n").forEach((l, i) => {
      if (/(?:color|background|fill|stroke)\s*[:=]\s*["']?#[0-9a-f]{3,8}\b/i.test(l) && !/theme-color/.test(l)) out.push(`${f}:${i + 1} hard-codes a color`);
      if (/\b(alert|confirm|prompt)\(/.test(l) && !/^\s*\/\//.test(l)) out.push(`${f}:${i + 1} uses a browser pop-up instead of the app's dialog`);
    });
  return out;
}

// ---------- run ----------
// Last run's screenshots, to show what changed.
const before = new Map();
if (fs.existsSync(SHOTS)) for (const f of fs.readdirSync(SHOTS)) before.set(f, fs.readFileSync(path.join(SHOTS, f)));
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const findings = { day: TODAY, source: sourceChecks(), scenarios: [], reach: [], speed: [] }, images = {}, shots = new Map();

for (const sc of SCENARIOS) {
  const result = { id: sc.id, title: sc.title, screens: {} };
  findings.scenarios.push(result);
  for (const scheme of sc.modes) {
    const { ctx, page, errors } = await open(browser, sc, scheme);
    await load(page, sc);
    for (const [title, go] of SCREENS.filter(([t]) => sc.screens === "all" || sc.screens.includes(t))) {
      errors.length = 0;
      await page.keyboard.press("Escape"); await page.waitForTimeout(150);
      try { await go(page); } catch (e) { errors.push(`couldn't open this screen: ${e.message.split("\n")[0]}`); }
      // What moves once the screen is open (late content, fonts, charts), then whether anything keeps moving.
      await frames(page); await page.evaluate(snapRects); await page.waitForTimeout(700);
      const moves = await page.evaluate(movedRects);
      const file = `${sc.id}-${slug(title)}-${scheme}`;
      const a = await page.screenshot({ type: "png" }); await page.waitForTimeout(500); const b = await page.screenshot({ type: "png" });
      fs.writeFileSync(path.join(SHOTS, `${file}.png`), b); shots.set(`${file}.png`, b);
      const motion = a.equals(b) ? [] : [`something on screen keeps moving with reduce motion on`];
      images[file] = `data:image/jpeg;base64,${(await page.screenshot({ type: "jpeg", quality: 72 })).toString("base64")}`;
      const m = await page.evaluate(inspect, { MIN_TAP, GUTTER, ACTIONS });
      (result.screens[title] ||= {})[scheme] = { file, ...m, moves, motion, errors: [...errors] };
      if (sc.id === "main" && scheme === "light" && REACH.includes(title)) {
        const zones = []; for (let y = 0; y < H; y += 26) for (let x = 0; x < W; x += 26) zones.push({ x, y, w: 26, h: 26, zone: zoneOf(x + 13, y + 13) });
        const actions = m.actions.map(x => ({ ...x, zone: zoneOf(x.x, x.y) }));
        await page.evaluate(drawReach, { zones, actions });
        images[`reach-${slug(title)}`] = `data:image/jpeg;base64,${(await page.screenshot({ type: "jpeg", quality: 72 })).toString("base64")}`;
        await page.evaluate(() => document.getElementById("audit-reach").remove());
        findings.reach.push({ screen: title, image: `reach-${slug(title)}`, actions: actions.map(({ label, zone, x, y }) => ({ label, zone, x: Math.round(x), y: Math.round(y) })) });
      }
    }
    await ctx.close();
  }
}

// Speed: the same taps on a phone about 4× slower than this computer, with motion on as most people have it.
{
  const sc = SCENARIOS[0], { ctx, page } = await open(browser, sc, "light", { motion: "no-preference" });
  const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: SLOW });
  await load(page, sc);
  await page.locator("#day-list > *").first().waitFor();
  findings.speed.push({ action: "Open the app until it can log", ms: await page.evaluate(() => performance.now()), budget: 1500 });
  const med = xs => xs.filter(x => x != null).sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const logs = [];
  for (let i = 0; i < 3; i++) { await page.fill("#exercise-search", "Barbell bench press — flat"); await page.click('#ex-results [data-name="Barbell bench press — flat"]');
    await page.fill("#weight", "135"); await page.fill("#reps", "5"); logs.push(await page.evaluate(timeTap, "#save")); await page.waitForTimeout(300); }
  findings.speed.push({ action: "Log set", ms: med(logs), budget: 100 });
  await page.evaluate(() => scrollTo(0, 0));
  findings.speed.push({ action: "Tap the exercise search", ms: await page.evaluate(timeTap, "#exercise-search"), budget: 100 });
  for (const t of ["plan", "history", "progress", "log"]) { const xs = [], from = t === "log" ? "progress" : "log";
    for (let i = 0; i < 3; i++) { await page.click(`nav.tabs [data-tab="${from}"]`); await page.waitForTimeout(300); xs.push(await page.evaluate(timeTap, `nav.tabs [data-tab="${t}"]`)); }
    findings.speed.push({ action: `Open the ${t[0].toUpperCase() + t.slice(1)} tab`, ms: med(xs), budget: 100 }); }
  await page.waitForTimeout(300);
  findings.speed.push({ action: "Open Settings", ms: await page.evaluate(timeTap, "#open-settings"), budget: 100 });
  findings.speed.forEach(s => { s.ms = s.ms == null ? null : Math.round(s.ms); });
  await ctx.close();
}

// What changed since the last run, screen by screen.
findings.changes = { compared: 0, changed: [], added: [], removed: [...before.keys()].filter(f => !shots.has(f)).map(f => f.replace(/\.png$/, "")) };
{
  const page = await browser.newPage(); await page.setContent("<body></body>");
  for (const [f, now] of shots) {
    const old = before.get(f); if (!old) { if (before.size) findings.changes.added.push(f.replace(/\.png$/, "")); continue; }
    findings.changes.compared++; if (old.equals(now)) continue;
    const d = await page.evaluate(diffImages, [`data:image/png;base64,${old.toString("base64")}`, `data:image/png;base64,${now.toString("base64")}`]);
    if (d.changed > .0002) findings.changes.changed.push({ file: f.replace(/\.png$/, ""), ...d, box: d.box?.map(v => Math.round(v / 2)) });
  }
  await page.close();
}
await browser.close(); server.close();

findings.wording = wording(findings.scenarios[0], fs.readFileSync(path.join(ROOT, "js/exercise-library.js"), "utf8"));
findings.consistency = consistency(findings.scenarios[0]);
const { total, issues, edge } = writeReport({ OUT, findings, images, W, H, SLOW, FREQUENT });
console.log(`${total} measured issue(s). Report: ${path.relative(ROOT, path.join(OUT, "index.html"))}`);
for (const x of findings.source) console.log("  source: " + x);
for (const i of issues) console.log(`  ${i.kind} (${i.modes.join(", ")}): ${i.issue}  [${i.screens.join(", ")}]`);
for (const e of edge) console.log(`  ${e.title}: ${e.issues.length} more (see the report)`);
