const { test, expect } = require("@playwright/test");
const { openApp, set, cardio } = require("./helpers");

test("the app uses the self-hosted Archivo font", async ({ page }) => {
  const errors = await openApp(page);
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('800 20px "Archivo"') && [...document.fonts].some(f => f.family.replace(/"/g, "") === "Archivo" && f.status === "loaded");
  });
  expect(loaded).toBe(true);
  expect(errors).toEqual([]);
});

test("the tab bar is a pill with the active tab in red", async ({ page }) => {
  const errors = await openApp(page);
  const look = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const nav = getComputedStyle(document.querySelector("nav.tabs"));
    const on = getComputedStyle(document.querySelector('nav.tabs [aria-selected="true"]'));
    const probe = document.createElement("i");
    document.body.append(probe);
    const color = v => { probe.style.color = css.getPropertyValue(v); return getComputedStyle(probe).color; };
    return { radius: parseFloat(nav.borderTopLeftRadius), navBg: nav.backgroundColor, pill: color("--pill"), onBg: on.backgroundColor, red: color("--red"), height: document.querySelector("nav.tabs button").getBoundingClientRect().height };
  });
  expect(look.radius).toBeGreaterThan(20);
  expect(look.navBg).toBe(look.pill);
  expect(look.onBg).toBe(look.red);
  expect(look.height).toBeGreaterThanOrEqual(40);
  expect(errors).toEqual([]);
});

test("on small phones the reps and sets steppers stack with + on top and − below", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  const errors = await openApp(page);
  for (const id of ["reps", "sets"]) {
    const plus = await page.locator(`[data-step="${id}"][data-dir="1"]`).boundingBox();
    const input = await page.locator(`#${id}`).boundingBox();
    const minus = await page.locator(`[data-step="${id}"][data-dir="-1"]`).boundingBox();
    expect(plus.y + plus.height).toBeLessThanOrEqual(input.y + 1);
    expect(input.y + input.height).toBeLessThanOrEqual(minus.y + 1);
    expect(plus.height).toBeGreaterThanOrEqual(40);
    expect(minus.height).toBeGreaterThanOrEqual(40);
  }
  // Weight spans the full width, so it keeps − and + side by side.
  const wMinus = await page.locator('[data-step="weight"][data-dir="-1"]').boundingBox();
  const wPlus = await page.locator('[data-step="weight"][data-dir="1"]').boundingBox();
  expect(Math.abs(wMinus.y - wPlus.y)).toBeLessThan(2);
  expect(errors).toEqual([]);
});

test("everything you tap is at least 40 px tall", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ exercise: "Barbell bench press — flat", muscle: "Chest", weight: 185, reps: 5 }), cardio({ exercise: "Treadmill", minutes: 20 })] });
  const small = () => page.evaluate(() => [...document.querySelectorAll("button, select, input:not([type=checkbox]):not([type=radio]):not([type=hidden])")]
    .filter(el => { const r = el.getBoundingClientRect(); return r.width && r.height && getComputedStyle(el).visibility !== "hidden" && r.height < 40; })
    .map(el => `${el.id || el.className || el.tagName} "${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().height)}px`));
  const found = { log: await small() };
  await page.click('nav.tabs [data-tab="progress"]');
  found.progress = await small();
  await page.click('nav.tabs [data-tab="history"]');
  for (const b of await page.locator("#history [data-more]").all()) await b.click();
  found.history = await small();
  await page.click("#open-settings");
  await page.locator("#settings").waitFor();
  found.settings = await small();
  expect(found).toEqual({ log: [], progress: [], history: [], settings: [] });
  expect(errors).toEqual([]);
});

test("fields and buttons have names for screen readers", async ({ page }) => {
  const errors = await openApp(page);
  const missing = await page.evaluate(() => [...document.querySelectorAll("input:not([type=hidden]), select, textarea")]
    .filter(el => !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.closest("label"))
    .map(el => el.id));
  expect(missing).toEqual([]);
  // The note's action button gets its text when shown; until then it's hidden from screen readers too.
  await expect(page.locator("#toast-act")).toBeHidden();
  expect(errors).toEqual([]);
});
