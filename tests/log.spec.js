const { test, expect } = require("@playwright/test");
const { TODAY, set, openApp } = require("./helpers");

const bench = "Barbell bench press — flat";

async function loadPPL(page) {
  await page.click('nav.tabs [data-tab="plan"]');
  await page.click('[data-tpl="ppl"]');
  await page.click('nav.tabs [data-tab="log"]');
}

test("the Today ring shows one segment per planned exercise", async ({ page }) => {
  // 2026-03-04 is Legs in the template; four squat sets finish its first exercise.
  const squats = [1, 2, 3, 4].map(() => set({ exercise: "High-bar back squat", muscle: "Legs", weight: 185, reps: 8 }));
  const errors = await openApp(page, { entries: squats });
  await expect(page.locator("#today-ring")).toBeHidden();
  await expect(page.locator("#head-title")).toHaveText("Today");
  await loadPPL(page);
  const ring = page.locator("#today-ring");
  await expect(ring).toBeVisible();
  await expect(ring.locator(".seg")).toHaveCount(6);
  await expect(ring.locator(".seg.done")).toHaveCount(1);
  await expect(ring.locator(".seg.now")).toHaveCount(1);
  await expect(ring).toContainText("1/6");
  await expect(page.locator("#head-kicker")).toContainText("Legs");
  await expect(page.locator("#head-next")).toHaveText("Next: Romanian deadlift");
  await page.click('nav.tabs [data-tab="history"]');
  await expect(page.locator("#head-title")).toHaveText("History");
  await expect(ring).toBeHidden();
  expect(errors).toEqual([]);
});

test("quick-add chips follow the unit", async ({ page }) => {
  const errors = await openApp(page);
  await page.selectOption("#exercise-pick", bench);
  await page.fill("#weight", "100");
  await expect(page.locator("#quick-add button")).toHaveText(["+2.5", "+10", "+45"]);
  await page.click('#quick-add [data-quick="10"]');
  await expect(page.locator("#weight")).toHaveValue("110");
  const box = await page.locator('#quick-add [data-quick="10"]').boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.click("#open-settings");
  await page.click('#settings [data-unit="kg"]');
  await page.click("#settings-done");
  await expect(page.locator("#quick-add button")).toHaveText(["+1.25", "+5", "+20"]);
  expect(errors).toEqual([]);
});

test("the weight shows what was lifted last time", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ date: "2026-02-25", exercise: bench, muscle: "Chest", weight: 135, reps: 8 })] });
  await page.selectOption("#exercise-pick", bench);
  await expect(page.locator("#w-last")).toHaveText("Last 135 × 8");
  await page.click("#save");
  await expect(page.locator("#w-last")).toHaveText("");
  expect(errors).toEqual([]);
});

test("the Log button becomes the rest countdown", async ({ page }) => {
  const errors = await openApp(page);
  await expect(page.locator("#rest-bar")).toHaveCount(0);
  await page.click("#rest-start");
  await expect(page.locator(".actions")).toHaveClass(/resting/);
  await expect(page.locator("#save-rest")).toHaveText("Resting 1:30 · tap to log");
  await expect(page.locator("#rest-start")).toHaveText("+30s");
  await expect(page.locator('nav.tabs [data-tab="log"]')).toHaveText("Log 1:30");
  await page.click("#rest-start");
  await expect(page.locator("#save-rest")).toHaveText("Resting 2:00 · tap to log");
  // Logging the next set restarts the timer at the default 90 seconds.
  await page.selectOption("#exercise-pick", bench);
  await page.fill("#weight", "135");
  await page.click("#save");
  await expect(page.locator("#msg")).toContainText("Logged 1 × 10 @ 135 lb");
  await expect(page.locator("#save-rest")).toHaveText("Resting 1:30 · tap to log");
  expect(errors).toEqual([]);
});

test("drop steps come in 5 lb increments with the percent", async ({ page }) => {
  const errors = await openApp(page);
  await page.selectOption("#exercise-pick", "Leg press");
  await page.fill("#weight", "50");
  await page.click('.mode [data-mode="drop"]');
  const step = page.locator("#drop-step");
  await expect(step.locator("option").first()).toHaveText("5 lb (10%)");
  await expect(step).toHaveValue("10");
  await step.selectOption("5");
  await page.click("#add-down");
  await expect(page.locator("#drop-rows [data-f=w]").nth(1)).toHaveValue("45");
  // The percent is worked out from the weight you're dropping from.
  await expect(step.locator("option").first()).toHaveText("5 lb (11%)");
  await expect(step).toHaveValue("5");
  expect(errors).toEqual([]);
});
