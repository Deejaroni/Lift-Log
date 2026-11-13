// The fixes from the 2026-11-01 UI audit: set details, pressed looks, units, small screens, sizes, reach and colors.
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { TODAY, openApp, pickExercise } = require("./helpers");
const { demo } = require("./fixtures/demo");

const withPlan = page => page.evaluate(async () => { const { loadTemplate } = await import("/js/plan.js"), { saveSettings } = await import("/js/state.js"); loadTemplate("ppl"); await saveSettings(); });
// Lines a piece of text takes up on screen.
const lines = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].filter(el => el.getClientRects().length).map(el => {
  const r = document.createRange(); r.selectNodeContents(el);
  return new Set([...r.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top / 4))).size;
}), sel);

test("a set's details sit on their own line under the weight, even on narrow phones", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const errors = await openApp(page, demo(TODAY));
  const rows = await page.evaluate(() => [...document.querySelectorAll("#day-list .set:not(.cardio-row)")].filter(s => s.querySelector(".num") && s.querySelector(".note"))
    .map(s => { const n = s.querySelector(".num").getBoundingClientRect(), d = s.querySelector(".note").getBoundingClientRect(); return { below: d.top >= n.bottom - 1, width: Math.round(d.width) }; }));
  expect(rows.length).toBeGreaterThan(1);
  for (const r of rows) { expect(r.below).toBe(true); expect(r.width).toBeGreaterThan(250); }
  expect(errors).toEqual([]);
});

test("numbers stay on the same line as their units", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const errors = await openApp(page, demo(TODAY));
  for (const sel of ["#day-list .cardio-kcal", "#day-list .ex-head .vol"]) {
    const n = await lines(page, sel);
    expect(n.length).toBeGreaterThan(0);
    expect(n.every(x => x === 1)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("every button looks pressed while you hold it", async ({ page }) => {
  const errors = await openApp(page, demo(TODAY));
  await withPlan(page);
  // Buttons that no :active rule in the stylesheet applies to.
  const flat = () => page.evaluate(() => {
    const act = [];
    const walk = rules => { for (const r of rules) { if (r.selectorText) { for (const s of r.selectorText.split(",")) if (s.includes(":active")) act.push(s.replace(/:active/g, "").trim()); } else if (r.cssRules) walk(r.cssRules); } };
    for (const sh of document.styleSheets) walk(sh.cssRules);
    return [...document.querySelectorAll("button")].filter(b => b.getClientRects().length && getComputedStyle(b).visibility !== "hidden" && !b.disabled)
      .filter(b => !act.some(s => { try { return b.matches(s); } catch { return false; } }))
      .map(b => `${b.id || b.className || b.tagName} "${(b.getAttribute("aria-label") || b.textContent).trim().slice(0, 24)}"`);
  });
  const found = { log: await flat() };
  await page.click('nav.tabs [data-tab="plan"]'); found.plan = await flat();
  await page.click('nav.tabs [data-tab="history"]');
  await page.locator("#history [data-more]").first().click(); found.history = await flat();
  await page.click('nav.tabs [data-tab="progress"]'); found.progress = await flat();
  await page.click("#open-settings"); await page.locator("#settings").waitFor(); found.settings = await flat();
  expect(found).toEqual({ log: [], plan: [], history: [], progress: [], settings: [] });
  expect(errors).toEqual([]);
});

test("on narrow screens the tab, tier and set-type labels fit", async ({ page }) => {
  // 300 px is a 390 px phone with its text size at 130%.
  await page.setViewportSize({ width: 300, height: 650 });
  const errors = await openApp(page, demo(TODAY));
  // Text wider than its box. Fonts draw about 7% wider on the Linux publish machine than on Windows (46.7 vs 43.7 px
  // for "Intermediate" in a 48 px column), so that run is the stricter check. A failure says how wide the text and box are.
  const cut = sel => page.evaluate(async s => { await document.fonts.ready;
    return [...document.querySelectorAll(s)].filter(el => el.getClientRects().length).map(el => { const r = document.createRange(); r.selectNodeContents(el); return { el, w: r.getBoundingClientRect().width }; })
      .filter(x => x.w > x.el.clientWidth + .5).map(({ el, w }) => `${el.textContent.trim()}: ${w.toFixed(1)} px of ${el.clientWidth} px (page ${innerWidth}/${document.documentElement.clientWidth}, `
        + `${getComputedStyle(el).fontStretch} ${getComputedStyle(el).fontWeight}, Archivo ${document.fonts.check('500 12px "Archivo"') ? "loaded" : "missing"})`); }, sel);
  expect(await cut("nav.tabs button")).toEqual([]);
  expect((await lines(page, "#log-form .mode button")).every(n => n === 1)).toBe(true);
  await page.click('nav.tabs [data-tab="progress"]');
  await expect(page.locator(".ladder").first()).toBeVisible();
  expect(await cut(".ladder span")).toEqual([]);
  expect(errors).toEqual([]);
});

test("settings you pick once per exercise come before the weight on the Log form", async ({ page }) => {
  const errors = await openApp(page);
  const order = await page.evaluate(() => {
    const mode = document.querySelector("#log-form .mode"), before = el => !!(el.compareDocumentPosition(mode) & Node.DOCUMENT_POSITION_FOLLOWING);
    return { variant: before(document.querySelector("#variant-wrap")), equipment: before(document.querySelector("#log-form .equip")), superset: before(document.querySelector("#ss-row")),
      weight: before(document.querySelector("#weight")) };
  });
  expect(order).toEqual({ variant: true, equipment: true, superset: true, weight: false });
  expect(errors).toEqual([]);
});

test("History's other-set bars are quieter in dark mode", async ({ page }) => {
  const errors = await openApp(page, demo(TODAY));
  await page.click('nav.tabs [data-tab="history"]');
  const look = await page.evaluate(() => ({ dark: matchMedia("(prefers-color-scheme: dark)").matches,
    other: +getComputedStyle(document.querySelector("#history .bars i:not(.top)")).opacity, top: +getComputedStyle(document.querySelector("#history .bars i.top")).opacity }));
  expect(look.top).toBe(1);
  if (look.dark) expect(look.other).toBeLessThan(.5); else expect(look.other).toBeGreaterThanOrEqual(.8);
  expect(errors).toEqual([]);
});

test("“No streak yet” is gray; a streak is red", async ({ page }) => {
  const color = () => page.evaluate(() => { const s = document.querySelector(".streak"), probe = document.createElement("i"); document.body.append(probe);
    const tok = v => { probe.style.color = `var(${v})`; return getComputedStyle(probe).color; };
    return { text: s.textContent, color: getComputedStyle(s).color, muted: tok("--muted"), red: tok("--red-ink") }; });
  const errors = await openApp(page);
  await page.click('nav.tabs [data-tab="progress"]');
  let c = await color();
  expect(c.text).toBe("No streak yet"); expect(c.color).toBe(c.muted);
  await page.evaluate(seed => { localStorage.setItem("liftlog.entries.v1", JSON.stringify(seed.entries)); localStorage.setItem("liftlog.prefs.v1", JSON.stringify(seed.prefs)); }, demo(TODAY));
  await page.reload(); await page.click('nav.tabs [data-tab="progress"]');
  c = await color();
  expect(c.text).toMatch(/week streak/); expect(c.color).toBe(c.red);
  expect(errors).toEqual([]);
});

test("after Log set, the exercise list and History catch up a moment later", async ({ page }) => {
  const errors = await openApp(page, demo(TODAY));
  await pickExercise(page, "EZ-bar curl");
  await page.fill("#weight", "77.5"); await page.fill("#reps", "9");
  await page.click("#save");
  await expect(page.locator("#ex-results .ex-opt").first()).toHaveAttribute("data-name", "Biceps curl");
  await page.click('nav.tabs [data-tab="history"]');
  await expect(page.locator("#history")).toContainText("77.5");
  expect(errors).toEqual([]);
});

test("sizes come from the app's scale", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "css", "app.css"), "utf8");
  // Text: 12, 13.6, 14.4, 16, 17.6, 20.8 and 25.6 px, plus big display numbers (1.8rem and up).
  const SIZES = [.75, .85, .9, 1, 1.1, 1.3, 1.6];
  const odd = [...css.matchAll(/font-size:([\d.]+)rem/g)].map(m => +m[1]).filter(v => v < 1.8 && !SIZES.includes(v));
  expect([...new Set(odd)]).toEqual([]);
  // Spacing moves in even steps (1 px is for hairline offsets).
  const space = [...css.matchAll(/(?:padding|margin|gap)(?:-[a-z]+)?:([^;}]*)/g)].flatMap(m => [...m[1].matchAll(/\b(\d+)px/g)].map(x => +x[1])).filter(v => v % 2 && v !== 1);
  expect([...new Set(space)]).toEqual([]);
  // Corners: 2 px for thin bars, then 4, 8, 10, 12 and 14, and 999 for pills.
  const radii = [...css.matchAll(/border-radius:(\d+)px/g)].map(m => +m[1]).filter(v => ![2, 4, 8, 10, 12, 14, 999].includes(v));
  expect([...new Set(radii)]).toEqual([]);
});
