const { test, expect } = require("@playwright/test");
const { set, cardio, openApp } = require("./helpers");

// TODAY is Wed 2026-03-04 (week of Mon Mar 2).
const lift = date => set({ date, exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 });
const days = [
  "2026-02-09", "2026-02-11", "2026-02-13",   // week of Feb 9: 3 days
  "2026-02-16", "2026-02-18", "2026-02-20",   // week of Feb 16: 3 days
  "2026-02-23", "2026-02-25", "2026-02-27",   // week of Feb 23: 3 days
  "2026-03-02",                               // this week so far: 2 days (with the cardio day below)
];
const entries = () => [...days.map(lift), lift("2026-02-13"), cardio({ date: "2026-03-03", exercise: "Treadmill", minutes: 20 })];
const openProgress = page => page.click('nav.tabs [data-tab="progress"]');
const panel = "#consistency";

test("the calendar marks training days for the month", async ({ page }) => {
  const errors = await openApp(page, { entries: entries() });
  await openProgress(page);
  await expect(page.locator(`${panel} .cal-title`)).toHaveText("March 2026");
  await expect(page.locator(`${panel} [data-day="2026-03-02"]`)).toHaveClass(/lift/);
  await expect(page.locator(`${panel} [data-day="2026-03-03"]`)).toHaveClass(/cardio/);
  await expect(page.locator(`${panel} [data-day="2026-03-04"]`)).toHaveClass(/today/);
  await expect(page.locator(`${panel} .cal-sum`)).toContainText("2 training days this month");
  const box = await page.locator(`${panel} [data-day="2026-03-02"]`).boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.click(`${panel} [data-cal="-1"]`);
  await expect(page.locator(`${panel} .cal-title`)).toHaveText("February 2026");
  await expect(page.locator(`${panel} .cal-sum`)).toContainText("9 training days this month");
  expect(errors).toEqual([]);
});

test("the streak counts weeks that hit the goal, and this week in progress doesn't break it", async ({ page }) => {
  const errors = await openApp(page, { entries: entries(), prefs: { unit: "lb" } });   // no weekGoal saved: defaults to 3
  await openProgress(page);
  await expect(page.locator(`${panel} .streak`)).toHaveText("3-week streak");
  await expect(page.locator(`${panel} .week-now`)).toHaveText("2 of 3 days this week");
  const chip = await page.locator(`${panel} [data-goal="2"]`).boundingBox();
  expect(chip.height).toBeGreaterThanOrEqual(40);
  await page.click(`${panel} [data-goal="2"]`);
  await expect(page.locator(`${panel} .streak`)).toHaveText("4-week streak");
  await expect(page.locator(`${panel} .week-now`)).toHaveText("2 of 2 days this week");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.prefs.v1")).weekGoal)).toBe(2);
  await page.click(`${panel} [data-goal="4"]`);
  await expect(page.locator(`${panel} .streak`)).toHaveText("No streak yet");
  expect(errors).toEqual([]);
});

test("tapping a training day opens it in History", async ({ page }) => {
  const errors = await openApp(page, { entries: entries() });
  await openProgress(page);
  await page.click(`${panel} [data-cal="-1"]`);
  await page.click(`${panel} [data-day="2026-02-18"]`);
  await expect(page.locator("#tab-history")).toBeVisible();
  await expect(page.locator("#day-2026-02-18")).toBeInViewport();
  expect(errors).toEqual([]);
});
