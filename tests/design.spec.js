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
