// The sample data used by the UI audit and screenshots stays valid as the app and library change.
const { test, expect } = require("@playwright/test");
const { TODAY, openApp } = require("./helpers");
const { demo } = require("./fixtures/demo");

test("the sample data loads cleanly and only uses library exercises", async ({ page }) => {
  const d = demo(TODAY);
  const errors = await openApp(page, d);
  const unknown = await page.evaluate(async names => { const { EX_INDEX } = await import("/js/search.js"); return names.filter(n => !EX_INDEX.has(n.toLowerCase())); },
    [...new Set(d.entries.map(e => e.exercise))]);
  expect(unknown).toEqual([]);
  // Six weeks of training, with today's session in progress.
  expect(new Set(d.entries.map(e => e.date)).size).toBeGreaterThan(15);
  await expect(page.locator("#day-list .set").first()).toBeVisible();
  await page.click('nav.tabs [data-tab="progress"]');
  await expect(page.locator(".lift-card").first()).toBeVisible();
  expect(errors).toEqual([]);
});
