// The tab bar hides while the on-screen keyboard is open, and otherwise follows the bottom of what's on screen
// (iOS can leave fixed bars stuck mid-screen after the keyboard closes or while scrolling).
const { test, expect } = require("@playwright/test");
const { openApp } = require("./helpers");

const fakeViewport = (page, kb, layoutShrink = 0) => page.evaluate(([kb, shrink]) => {
  const vv = window.visualViewport, full = window.__fullH ??= innerHeight;
  Object.defineProperty(vv, "height", { get: () => full - kb, configurable: true });
  Object.defineProperty(vv, "offsetTop", { get: () => 0, configurable: true });
  Object.defineProperty(window, "innerHeight", { get: () => full - shrink, configurable: true });
  vv.dispatchEvent(new Event("resize"));
}, [kb, layoutShrink]);

test("the tab bar hides while the keyboard is open", async ({ page }) => {
  const errors = await openApp(page);
  const nav = page.locator("nav.tabs");
  await expect(nav).toBeVisible();
  await page.focus("#weight");
  await fakeViewport(page, 340);
  await expect(nav).toBeHidden();
  await page.locator("#weight").blur();
  await fakeViewport(page, 0);
  await expect(nav).toBeVisible();
  expect(errors).toEqual([]);
});

test("if the page's fixed layer is left short, the tab bar moves back to the bottom", async ({ page }) => {
  const errors = await openApp(page);
  await fakeViewport(page, 0, 300);   // what iOS reports when the bar is stuck 300 px up
  await expect(page.locator("nav.tabs")).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 300)");
  await fakeViewport(page, 0, 0);
  await expect(page.locator("nav.tabs")).toHaveCSS("transform", "none");
  expect(errors).toEqual([]);
});
