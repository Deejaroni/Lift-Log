const { test, expect } = require("@playwright/test");
const { set, openApp, pickExercise } = require("./helpers");

const bench = "Bench press", row = "Seated row";   // parent exercises
const openHistory = page => page.click('nav.tabs [data-tab="history"]');

test("Last time folds to one line and opens to every set with its details", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ date: "2026-02-20", exercise: bench, muscle: "Chest", weight: 125, reps: 8 }),
    set({ date: "2026-03-01", exercise: bench, muscle: "Chest", weight: 135, reps: 8, rir: 2, note: "Seat 4", equip: { barbell: { type: "Straight bar" } }, ts: 1 }),
    set({ date: "2026-03-01", exercise: bench, muscle: "Chest", weight: 135, reps: 8, equip: { barbell: { type: "Straight bar" } }, ts: 2 }),
    set({ date: "2026-03-01", exercise: bench, muscle: "Chest", weight: 135, reps: 7, failure: true, equip: { barbell: { type: "Straight bar" } }, ts: 3 }),
    ...[115, 95].map((w, i) => set({ date: "2026-03-01", exercise: bench, muscle: "Chest", weight: w, reps: 8, chain: "c1", step: i, ts: 4 + i })),
  ] });
  await pickExercise(page, bench);
  const lt = page.locator("#last-time");
  await expect(lt).toBeVisible();
  await expect(page.locator("#lt-sum")).toHaveText(/Last time\s*Sun, Mar 1 · best 135 × 8/);
  await expect(page.locator("#lt-body")).toBeHidden();
  const box = await page.locator("#lt-sum").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.click("#lt-sum");
  await expect(page.locator("#lt-sum")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#lt-sum")).toContainText("Sun, Mar 1 · 3 days ago");
  const rows = page.locator("#lt-body .lt-row");
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toContainText("135 lb × 8");
  await expect(rows.nth(0)).toContainText("2 left · RPE 8");
  await expect(rows.nth(2)).toContainText("To failure");
  await expect(rows.nth(3)).toContainText("Drop set: 115 × 8 → 95 × 8");
  await expect(page.locator("#lt-body .lt-note")).toContainText("Barbell: Straight bar");
  await expect(page.locator("#lt-body .lt-note")).toContainText("Seat 4");
  // Tapping a set copies its weight and reps.
  await rows.nth(2).click();
  await expect(page.locator("#weight")).toHaveValue("135");
  await expect(page.locator("#reps")).toHaveValue("7");
  expect(errors).toEqual([]);
});

test("Last time is hidden for an exercise you haven't done before that day", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ exercise: row, muscle: "Back", weight: 100, reps: 10 })] });
  await pickExercise(page, row);   // only logged today
  await expect(page.locator("#last-time")).toBeHidden();
  await page.click("#ex-change");
  await pickExercise(page, bench);   // never logged
  await expect(page.locator("#last-time")).toBeHidden();
  expect(errors).toEqual([]);
});

test("History: Day opens a calendar that jumps to a training day", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    ...["2026-03-03", "2026-03-01", "2026-02-25", "2026-02-18", "2026-02-11", "2026-02-04"].map(d => set({ date: d, exercise: bench, muscle: "Chest", weight: 135, reps: 8 })),
  ] });
  await openHistory(page);
  await expect(page.locator("#hist-filter")).toBeHidden();
  await expect(page.locator("#hist-cal")).toBeHidden();
  await page.click("#hist-day");
  await expect(page.locator("#hist-cal")).toBeVisible();
  await expect(page.locator("#hist-cal .cal-title")).toHaveText("March 2026");
  await expect(page.locator("#hist-cal button.cal-day")).toHaveText(["1", "3"]);
  await page.click('#hist-cal [data-hcal="-1"]');
  await expect(page.locator("#hist-cal .cal-title")).toHaveText("February 2026");
  await page.click('#hist-cal [data-hday="2026-02-04"]');
  await expect(page.locator("#hist-cal")).toBeHidden();
  await expect(page.locator("#day-2026-02-04")).toBeInViewport();
  expect(errors).toEqual([]);
});

test("History: Exercise picks one exercise, shows its summary, and Clear goes back", async ({ page }) => {
  const errors = await openApp(page, { settings: { favs: [row] }, entries: [
    set({ date: "2026-02-25", exercise: bench, muscle: "Chest", weight: 135, reps: 8 }),
    set({ date: "2026-03-01", exercise: bench, muscle: "Chest", weight: 145, reps: 5 }),
    set({ date: "2026-03-01", exercise: row, muscle: "Back", weight: 100, reps: 10 }),
    set({ date: "2026-03-02", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 }),
  ] });
  await openHistory(page);
  await expect(page.locator("#hist-ex span")).toHaveText("All");
  await page.click("#hist-ex");
  await expect(page.locator("#hist-pick")).toBeVisible();
  await expect(page.locator("#hist-pick [data-hex] .ex-n")).toHaveText([`${row} ★`, "Leg press", bench]);   // favorites (starred), then most recent
  await page.fill("#hist-q", "bench");
  await expect(page.locator("#hist-pick [data-hex] .ex-n")).toHaveText([bench]);
  await page.click(`#hist-pick [data-hex="${bench}"]`);
  await expect(page.locator("#hist-pick")).toBeHidden();
  await expect(page.locator("#hist-ex span")).toHaveText(bench);
  await expect(page.locator("#history .day-head")).toHaveCount(2);
  await expect(page.locator("#history .ex-head h3 .ex-name-btn")).toHaveText([bench, bench]);
  const sum = page.locator("#hist-sum");
  await expect(sum.locator(".ex-sum b")).toHaveText(["2", "135 × 8", "171 lb"]);
  await expect(sum).toContainText("Since Wed, Feb 25 · last Sun, Mar 1");
  await page.click("#hist-clear");
  await expect(page.locator("#hist-sum")).toBeHidden();
  await expect(page.locator("#history .day-head")).toHaveCount(3);
  expect(errors).toEqual([]);
});
