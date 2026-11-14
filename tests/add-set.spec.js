// "+ Add set" under each exercise in the Log tab's day list: copies that exercise's last set (for a set logged
// too early, or one too few), with Undo.
const { test, expect } = require("@playwright/test");
const { TODAY, set, openApp } = require("./helpers");

const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1")));
const bench = (o = {}) => set({ exercise: "Bench press", muscle: "Chest", weight: 185, reps: 5, variant: { equip: "Barbell", angle: "Flat" }, equip: { bb: { bar: 45 } }, ...o });

test("+ Add set copies the exercise's last set, and Undo takes it back", async ({ page }) => {
  const errors = await openApp(page, { entries: [bench({ id: "a", ts: 10 }), bench({ id: "b", ts: 20, reps: 4, rir: 1, note: "paused" })] });
  const add = page.locator('#day-list .ex-group[data-ex="bench press"] [data-add-set]');
  await expect(add).toHaveText("+ Add set · 185 lb × 4");
  const box = await add.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await add.click();
  await expect(page.locator('#day-list .ex-group[data-ex="bench press"] .set')).toHaveCount(3);
  await expect(page.locator("#toast-msg")).toHaveText("Set added.");
  const list = await stored(page), copy = list.find(e => e.id !== "a" && e.id !== "b");
  expect(copy).toMatchObject({ date: TODAY, exercise: "Bench press", weight: 185, reps: 4, rir: 1, note: "paused", variant: { equip: "Barbell", angle: "Flat" }, equip: { bb: { bar: 45 } } });
  expect(copy.ts).toBeGreaterThan(20);
  await expect(page.locator(".actions")).not.toHaveClass(/resting/);   // the set was already done: no rest timer
  await page.click("#toast-act");
  await expect(page.locator('#day-list .ex-group[data-ex="bench press"] .set')).toHaveCount(2);
  expect((await stored(page)).length).toBe(2);
  expect(errors).toEqual([]);
});

test("History has no + Add set", async ({ page }) => {
  const errors = await openApp(page, { entries: [bench()] });
  await page.click('nav.tabs [data-tab="history"]');
  await expect(page.locator("#history .ex-group").first()).toBeVisible();
  await expect(page.locator("#history [data-add-set]")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a set logged today counts toward the PR the suggestion names", async ({ page }) => {
  const errors = await openApp(page, { entries: [bench({ date: "2026-02-18", weight: 180 }), bench({ date: "2026-02-25", weight: 180 }), bench({ weight: 190 })] });
  const r = await page.evaluate(async () => (await import("/js/suggest.js")).nextSet("Bench press", "2026-03-04"));
  expect(r.prText).toContain("Your PR is 190 × 5 (Mar 4)");
  expect(errors).toEqual([]);
});
