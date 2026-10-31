const { test, expect } = require("@playwright/test");
const { set, cardio, openApp } = require("./helpers");

// TODAY is Wed 2026-03-04, so this week starts Mon 2026-03-02.
const bench = (date, n) => Array.from({ length: n }, () => set({ date, exercise: "Barbell bench press — flat", muscle: "Chest", weight: 135, reps: 8 }));
const week = () => [
  ...bench("2026-03-02", 3),
  ...Array.from({ length: 2 }, () => set({ date: "2026-03-03", exercise: "Lat pulldown — wide overhand", muscle: "Back", weight: 120, reps: 10 })),
  ...[300, 250, 200].map((w, i) => set({ date: "2026-03-04", exercise: "Leg press", muscle: "Quadriceps", weight: w, reps: 10, chain: "c1", step: i })),
  cardio({ date: "2026-03-04", exercise: "Treadmill", minutes: 20 }),
  ...bench("2026-02-25", 4),
  ...bench("2026-02-20", 5),   // two weeks ago: not shown
];
const val = (page, m) => page.locator(`#muscle-sets [data-m="${m}"] .ms-val`);
const last = (page, m) => page.locator(`#muscle-sets [data-m="${m}"] .ms-last`);

test("Progress shows this week's sets per muscle, with half sets for the other muscles a lift works", async ({ page }) => {
  const errors = await openApp(page, { entries: week() });
  await page.click('nav.tabs [data-tab="progress"]');
  await expect(page.locator("#muscle-sets h2")).toHaveText("Sets per muscle");
  await expect(val(page, "Chest")).toHaveText("3");
  await expect(last(page, "Chest")).toHaveText("4");
  await expect(val(page, "Shoulders")).toHaveText("1.5");
  await expect(val(page, "Triceps")).toHaveText("1.5");
  await expect(val(page, "Back")).toHaveText("2");
  await expect(val(page, "Biceps")).toHaveText("1");
  await expect(val(page, "Quadriceps")).toHaveText("1");     // a drop set counts once
  await expect(val(page, "Hamstrings")).toHaveText("0");     // untrained groups still show
  await expect(page.locator('#muscle-sets [data-m="Cardio"]')).toHaveCount(0);
  await expect(page.locator('#muscle-sets [data-m="Full body"]')).toHaveCount(0);
  await expect(page.locator("#muscle-sets")).toContainText("rough guide");
  expect(errors).toEqual([]);
});

test("your own muscle choices change the counts", async ({ page }) => {
  const errors = await openApp(page, { entries: bench("2026-03-02", 2), settings: { bw: null, bwUnit: "lb", days: {}, bwLog: {}, exercises: { "barbell bench press — flat": { muscle: "Chest", also: ["Triceps"] } } } });
  await page.click('nav.tabs [data-tab="progress"]');
  await expect(val(page, "Triceps")).toHaveText("1");
  await expect(val(page, "Shoulders")).toHaveText("0");
  expect(errors).toEqual([]);
});
