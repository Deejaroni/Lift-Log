// Finish workout: a button under today's list opens a short summary (time, sets, volume vs last time, records).
const { test, expect } = require("@playwright/test");
const { TODAY, set, openApp } = require("./helpers");

const at = (date, hm) => Date.parse(`${date}T${hm}:00Z`);   // tests run in UTC
const ex = (name, sets, date = TODAY) => sets.map(([weight, reps, hm]) => set({ date, exercise: name, muscle: "Other", weight, reps, ...(hm ? { ts: at(date, hm) } : {}) }));
const PREV = "2026-03-02";

test("Finish workout shows time, sets, volume against last time, and records", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    ...ex("Leg press", [[400, 8, "17:00"], [400, 8, "17:05"], [400, 8, "17:10"]], PREV),
    ...ex("Leg curl", [[100, 10, "17:20"]], PREV),
    ...ex("Leg press", [[400, 10, "17:12"], [400, 10, "17:20"], [400, 10, "17:30"]]),
    ...ex("Leg curl", [[100, 10, "18:24"]]),
  ] });
  const btn = page.locator("#day-list #finish-workout");
  await expect(btn).toHaveText("Finish workout");
  await btn.click();
  const s = page.locator("#sum-sheet");
  await expect(s).toBeVisible();
  await expect(s.locator("#sum-title")).toHaveText("Workout done");
  await expect(s.locator(".sum-when")).toHaveText("Wed, Mar 4 · 5:12–6:24 pm");
  await expect(s.locator(".stat .num")).toHaveText(["1:12", "4", "13,000"]);
  // 13,000 lb today vs 10,600 lb on Mar 2 (same exercises) = +23%
  await expect(s.locator(".stat small").nth(2)).toHaveText("lb lifted, +23%");
  await expect(s.locator(".sum-vs")).toHaveText("Compared with Mon, Mar 2");
  await expect(s.locator(".sum-prs li")).toHaveText(["PR Leg press: est. 1RM 533 lb, up from 507 lb", "Biggest day Your most volume in one day"]);
  await s.locator("#sum-done").click();
  await expect(s).toBeHidden();
  await expect(btn).toBeFocused();
  expect(errors).toEqual([]);
});

test("a first workout has no comparison, says so when there are no records, and closes with Escape", async ({ page }) => {
  const errors = await openApp(page, { entries: ex("Leg press", [[400, 10], [400, 10]]) });
  await page.click("#finish-workout");
  const s = page.locator("#sum-sheet");
  await expect(s.locator(".stat .num")).toHaveText(["—", "2", "8,000"]);
  await expect(s.locator(".stat small").nth(2)).toHaveText("lb lifted");
  await expect(s.locator(".sum-vs")).toHaveCount(0);
  await expect(s.locator(".sum-none")).toHaveText("No new records this time.");
  await page.keyboard.press("Escape");
  await expect(s).toBeHidden();
  expect(errors).toEqual([]);
});

test("the planned workout's name is the title and the last time it was done is the comparison", async ({ page }) => {
  const program = { name: "My program", template: "", mode: "rotate", days: [null, null, null, null, null, null, null], rotation: ["w1"],
    workouts: [{ id: "w1", name: "Legs", items: [{ exercise: "Leg press" }] }], prog: { on: false, upper: 5, lower: 10, unit: "lb" }, deloadEvery: 0, start: "2026-02-16", override: null,
    done: { "2026-02-20": "w1", [PREV]: "w1" } };
  const errors = await openApp(page, { settings: { days: {}, program }, entries: [
    ...ex("Leg press", [[300, 10]], "2026-02-20"),
    ...ex("Squat", [[200, 5]], "2026-03-03"),
    ...ex("Leg press", [[400, 10]], PREV),
    ...ex("Leg press", [[400, 10]]),
  ] });
  await page.click("#finish-workout");
  const s = page.locator("#sum-sheet");
  await expect(s.locator("#sum-title")).toHaveText("Legs · done");
  await expect(s.locator(".stat small").nth(2)).toHaveText("lb lifted, same as last time");
  await expect(s.locator(".sum-vs")).toHaveText("Compared with Mon, Mar 2");
  expect(errors).toEqual([]);
});

test("no Finish workout button when nothing is logged today", async ({ page }) => {
  const errors = await openApp(page, { entries: ex("Leg press", [[400, 10]], PREV) });
  await expect(page.locator("#finish-workout")).toHaveCount(0);
  expect(errors).toEqual([]);
});
