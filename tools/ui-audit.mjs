// UI audit: opens the app with the sample data in tests/fixtures/demo.js at phone size, in light and dark,
// screenshots each screen and measures what the design rules in CLAUDE.md ask for.
// Run: npm run audit:ui   Output: tools/out/ui-audit/index.html (gallery + findings) and findings.json.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const { demo } = require("../tests/fixtures/demo.js");

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out", "ui-audit");
const W = 390, H = 844, MIN_TAP = 40;
const TODAY = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

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

// ---------- checks that run in the page ----------
// Visible controls shorter than 40 px, fields with no name, text below WCAG contrast, and sideways scrolling.
function measure(MIN_TAP) {
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const name = el => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""}`;
  const text = el => (el.getAttribute("aria-label") || el.textContent || el.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 32);
  const small = [...document.querySelectorAll("button, select, a[href], [role=button], input:not([type=hidden]):not([type=checkbox]):not([type=radio])")]
    .filter(vis).filter(el => el.getBoundingClientRect().height < MIN_TAP)
    .map(el => `${name(el)} "${text(el)}" is ${Math.round(el.getBoundingClientRect().height)} px tall`);
  const unnamed = [...document.querySelectorAll("input:not([type=hidden]), select, textarea, button")].filter(vis)
    .filter(el => !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.title && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.closest("label") && !(el.tagName === "BUTTON" && el.textContent.trim()))
    .map(el => `${name(el)} has no name for screen readers`);
  // Contrast: each element's own text against the first solid background behind it.
  const rgb = c => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c && (c[3] === undefined || c[3] > .9)) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
  const low = new Map();
  for (const el of document.querySelectorAll("body *")) {
    if (!vis(el) || el.closest("svg, [aria-hidden=true]")) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(" ").trim();
    if (!own) continue;
    const s = getComputedStyle(el), fg = rgb(s.color), bg = bgOf(el);
    if (!fg || (fg[3] !== undefined && fg[3] < .9) || +s.opacity < 1) continue;
    const [a, b] = [lum(fg), lum(bg)], ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const size = parseFloat(s.fontSize), large = size >= 24 || (size >= 18.66 && +s.fontWeight >= 700), need = large ? 3 : 4.5;
    if (ratio < need) { const k = `${s.color} on rgb(${bg.slice(0, 3).join(", ")})`; if (!low.has(k)) low.set(k, `"${own.slice(0, 32)}" ${ratio.toFixed(2)}:1, needs ${need}:1 (${name(el)}, ${s.color} on rgb(${bg.slice(0, 3).join(", ")}))`); }
  }
  const wide = document.documentElement.scrollWidth > innerWidth + 1 ? [`the page scrolls sideways (${document.documentElement.scrollWidth} px wide)`] : [];
  return { small, unnamed, contrast: [...low.values()], wide };
}

// ---------- the screens ----------
const tab = t => async page => { await page.click(`nav.tabs [data-tab="${t}"]`); await page.waitForTimeout(400); };
const SCREENS = [
  ["Log: top", tab("log")],
  ["Log: today's sets", async page => { await tab("log")(page); await page.locator("#day-list").scrollIntoViewIfNeeded(); }],
  ["Exercise picker", async page => { await tab("log")(page); await page.click("#exercise-search"); await page.fill("#exercise-search", ""); await page.waitForTimeout(300); }],
  ["Search results", async page => { await tab("log")(page); await page.fill("#exercise-search", "bench"); await page.waitForTimeout(300); }],
  ["Exercise sheet", async page => { await tab("log")(page); await page.fill("#exercise-search", "Barbell bench press — flat");
    await page.click('#ex-results [data-name="Barbell bench press — flat"]'); await page.click("#ex-chosen-text"); await page.locator("#exsheet").waitFor(); await page.waitForTimeout(500); }],
  ["Plan", tab("plan")],
  ["History", async page => { await tab("history")(page); const more = page.locator("#history [data-more]").first(); if (await more.count()) await more.click(); }],
  ["Progress: top", tab("progress")],
  ["Progress: charts", async page => { await tab("progress")(page); await page.locator("#prog-ex").scrollIntoViewIfNeeded(); }],
  ["Settings", async page => { await tab("log")(page); await page.click("#open-settings"); await page.locator("#settings").waitFor(); }],
];

async function open(browser, scheme) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: scheme, serviceWorkers: "block", deviceScaleFactor: 2 });
  await ctx.addInitScript(seed => {
    if (sessionStorage.getItem("seeded")) return; sessionStorage.setItem("seeded", "1"); localStorage.clear();
    localStorage.setItem("liftlog.entries.v1", JSON.stringify(seed.entries));
    localStorage.setItem("liftlog.settings.v1", JSON.stringify(seed.settings));
    localStorage.setItem("liftlog.prefs.v1", JSON.stringify(seed.prefs));
  }, demo(TODAY));
  const page = await ctx.newPage(), errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto(BASE);
  // A loaded plan, so the Plan tab and the Today ring have content.
  await page.evaluate(async () => { const { loadTemplate } = await import("./js/plan.js"), { saveSettings } = await import("./js/state.js"); loadTemplate("ppl"); await saveSettings(); });
  await page.reload();
  return { ctx, page, errors };
}

// ---------- checks on the source ----------
// Colors outside the token blocks in css/app.css, and inline colors in the page and modules.
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
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const findings = { source: sourceChecks(), screens: {} }, images = {};   // screenshots go into the report itself, so it opens anywhere
for (const scheme of ["light", "dark"]) {
  const { ctx, page, errors } = await open(browser, scheme);
  for (const [title, go] of SCREENS) {
    errors.length = 0;
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    try { await go(page); } catch (e) { errors.push(`couldn't open this screen: ${e.message.split("\n")[0]}`); }
    await page.waitForTimeout(300);
    const file = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${scheme}.jpg`;
    const shot = await page.screenshot({ path: path.join(OUT, file), type: "jpeg", quality: 75 });
    images[file] = `data:image/jpeg;base64,${shot.toString("base64")}`;
    const m = await page.evaluate(measure, MIN_TAP);
    const f = (findings.screens[title] ||= {});
    f[scheme] = { file, ...m, errors: [...errors] };
  }
  await ctx.close();
}
await browser.close(); server.close();

// ---------- report ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const KINDS = [["small", "Tap targets under 40 px"], ["contrast", "Low contrast text"], ["unnamed", "No screen-reader name"], ["wide", "Sideways scrolling"], ["errors", "Console errors"]];
// Each issue once, with the screens and modes it showed up on (the Log tab sits behind Settings and the sheet).
const issues = new Map();
for (const [title, s] of Object.entries(findings.screens)) for (const sc of ["light", "dark"]) for (const [k, label] of KINDS) for (const x of s[sc][k] || []) {
  const key = `${label}|${x}`; if (!issues.has(key)) issues.set(key, { label, text: x, where: new Set(), modes: new Set() });
  issues.get(key).where.add(title); issues.get(key).modes.add(sc);
}
findings.issues = [...issues.values()].map(i => ({ kind: i.label, issue: i.text, modes: [...i.modes], screens: [...i.where] }));
const total = findings.issues.length + findings.source.length;
const list = KINDS.map(([, label]) => { const xs = findings.issues.filter(i => i.kind === label);
  return xs.length ? `<section><h2>${label} (${xs.length})</h2><ul>${xs.map(i => `<li>${esc(i.issue)} <small>${i.modes.join(" and ")} · ${esc(i.screens.join(", "))}</small></li>`).join("")}</ul></section>` : ""; }).join("");
const rows = Object.entries(findings.screens).map(([title, s]) => `<section><h2>${esc(title)}</h2><div class="pair"><figure><img src="${images[s.light.file]}" alt=""><figcaption>Light</figcaption></figure><figure><img src="${images[s.dark.file]}" alt=""><figcaption>Dark</figcaption></figure></div></section>`).join("");
fs.writeFileSync(path.join(OUT, "findings.json"), JSON.stringify(findings, null, 1));
fs.writeFileSync(path.join(OUT, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UI audit</title>
<style>body{margin:0;padding:16px;font:15px/1.45 system-ui,sans-serif;background:#f4f5f7;color:#1b2430}h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:0 0 8px}
section{background:#fff;border:1px solid #d8dde3;border-radius:12px;padding:12px;margin:12px 0}.pair{display:flex;gap:10px;overflow-x:auto}figure{margin:0;flex:0 0 auto}
img{width:195px;border:1px solid #d8dde3;border-radius:10px;display:block}figcaption{font-size:12px;color:#5b6776;margin-top:2px}ul{margin:8px 0 0;padding-left:18px}small{color:#5b6776}</style></head>
<body><h1>UI audit, ${TODAY}</h1><p>${total} measured issue${total === 1 ? "" : "s"} at ${W} × ${H}, light and dark, with the sample data. Measured: tap targets, contrast, screen-reader names, sideways scrolling, console errors. Judge the rest by eye.</p>
${findings.source.length ? `<section><h2>Source (${findings.source.length})</h2><ul>${findings.source.map(x => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}${list}<h1 style="margin-top:20px">Screens</h1>${rows}</body></html>`);
console.log(`${total} measured issue(s). Report: ${path.relative(ROOT, path.join(OUT, "index.html"))}`);
for (const x of findings.source) console.log("  source: " + x);
for (const i of findings.issues) console.log(`  ${i.kind} (${i.modes.join(", ")}): ${i.issue}  [${i.screens.join(", ")}]`);
