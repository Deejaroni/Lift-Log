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
