const { test, expect } = require("@playwright/test");
const { openApp } = require("./helpers");

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
