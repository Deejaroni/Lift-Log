const { test, expect } = require("@playwright/test");
const { set, openApp } = require("./helpers");

const bench = "Barbell bench press — flat";

test("History shows a bar per set, the top set, est. 1RM and PRs", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ date: "2026-02-25", exercise: bench, muscle: "Chest", weight: 135, reps: 8 }),
    set({ exercise: bench, muscle: "Chest", weight: 135, reps: 8 }),
    set({ exercise: bench, muscle: "Chest", weight: 155, reps: 6 }),
    set({ exercise: bench, muscle: "Chest", weight: 165, reps: 5 }),
  ] });
  await page.click('nav.tabs [data-tab="history"]');
  const [newest, oldest] = [page.locator("#history .panel").nth(0), page.locator("#history .panel").nth(1)];
  await expect(newest.locator(".bars i")).toHaveCount(3);
  await expect(newest.locator(".bars i.top")).toHaveCount(1);
  await expect(newest.locator(".bar-labels span").nth(2)).toHaveText("165×5");
  await expect(newest.locator(".ex-foot")).toHaveText("est. 1RM 193 lb");
  await expect(newest.locator(".pr")).toHaveText("PR");
  // The first time you do an exercise isn't a PR.
  await expect(oldest.locator(".pr")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("History hides Edit and Delete behind a menu button", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "e1", exercise: bench, muscle: "Chest", weight: 135, reps: 8 })] });
  await page.click('nav.tabs [data-tab="history"]');
  const row = page.locator("#history .set").first();
  await expect(row.locator("[data-edit]")).toBeHidden();
  await row.locator("[data-more]").click();
  await expect(row.locator("[data-edit]")).toBeVisible();
  await expect(row.locator("[data-del]")).toBeVisible();
  const box = await row.locator("[data-del]").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await row.locator("[data-del]").click();
  await expect(page.locator("#dlg-msg")).toHaveText("Delete this set?");
  expect(errors).toEqual([]);
});
