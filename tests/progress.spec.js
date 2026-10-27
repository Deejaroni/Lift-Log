const { test, expect } = require("@playwright/test");
const { set, openApp, bodyWeight } = require("./helpers");

const bench = "Barbell bench press — flat";
// Est. 1RMs: 171 (Jan 20), 192.5 (Feb 25), 204.2 (today, Mar 4).
const benchSets = () => [
  set({ date: "2026-01-20", exercise: bench, muscle: "Chest", weight: 135, reps: 8 }),
  set({ date: "2026-02-25", exercise: bench, muscle: "Chest", weight: 165, reps: 5 }),
  set({ exercise: bench, muscle: "Chest", weight: 175, reps: 5 }),
];

test("Progress shows a card per lift with est. 1RM, change and trend", async ({ page }) => {
  const errors = await openApp(page, { entries: benchSets() });
  await page.click('nav.tabs [data-tab="progress"]');
  const card = page.locator(".lift-card");
  await expect(card).toHaveCount(1);
  await expect(card.locator(".lc-name")).toHaveText("Bench press");
  await expect(card.locator(".lc-num")).toHaveText("204");
  await expect(card.locator(".lc-change")).toHaveText("+33 lb in 30 days");
  await expect(card.locator("svg.spark polyline")).toHaveCount(1);
  // No standards chosen yet, so no tier.
  await expect(card.locator(".lc-tier")).toHaveCount(0);
  await expect(page.locator("#ex-chart")).toBeVisible();
  expect(errors).toEqual([]);
});

test("lift cards show the strength tier ladder", async ({ page }) => {
  const errors = await openApp(page, { entries: benchSets(), settings: bodyWeight(180, "lb", { profile: { std: "men" } }) });
  await page.click('nav.tabs [data-tab="progress"]');
  const card = page.locator(".lift-card");
  await expect(card.locator(".lc-tier")).toHaveText("Intermediate");
  const segs = card.locator(".ladder i b");
  await expect(segs).toHaveCount(4);
  await expect(segs.nth(0)).toHaveAttribute("style", /width:100%/);
  await expect(segs.nth(1)).toHaveAttribute("style", /width:100%/);
  await expect(segs.nth(2)).toHaveAttribute("style", /width:27%/);
  await expect(segs.nth(3)).toHaveAttribute("style", /width:0%/);
  await expect(page.locator("#std-panel")).toContainText("Tiers are the app's approximate estimates");
  expect(errors).toEqual([]);
});
