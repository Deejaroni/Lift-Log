// The next-set suggestion also shows your PR (best est. 1RM, sets of 10 reps or fewer) and, when it's a good day
// to try, the smallest set that would beat it. A suggestion that beats it gets a PR tag.
const { test, expect } = require("@playwright/test");
const { set, openApp, pickExercise } = require("./helpers");

const bench = (date, weight, reps, extra = {}) => set({ date, exercise: "Bench press", muscle: "Chest", weight, reps, variant: { equip: "Barbell", angle: "Flat" }, ...extra });

test("when today's suggestion doesn't beat your PR, it shows the PR and a set that would", async ({ page }) => {
  const errors = await openApp(page, { entries: [bench("2026-01-28", 185, 5), bench("2026-02-18", 175, 5), bench("2026-02-25", 180, 5), bench("2026-02-25", 180, 5)] });
  await pickExercise(page, "Bench press");
  const sug = page.locator("#sug");
  await expect(sug.locator("b")).toHaveText("Try 185 × 5");
  await expect(sug).toContainText("Your PR is 185 × 5 (Jan 28); 180 × 6 would beat it.");
  await expect(sug.locator(".pr")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a suggestion that would beat your PR is tagged PR", async ({ page }) => {
  const errors = await openApp(page, { entries: [bench("2026-02-18", 180, 5), bench("2026-02-25", 180, 5)] });
  await pickExercise(page, "Bench press");
  const sug = page.locator("#sug");
  await expect(sug.locator("b")).toHaveText("Try 185 × 5PR");
  await expect(sug.locator(".pr")).toHaveText("PR");
  await expect(sug).toContainText("Your PR is 180 × 5 (Feb 18), so this beats it.");
  expect(errors).toEqual([]);
});

test("one more rep is suggested when it's the smaller step", async ({ page }) => {
  // PR 200 × 3 (est. 1RM 220). At 8 reps it takes 175 × 8 (221.7); one more rep at 165 (165 × 9) is only 214.5.
  const errors = await openApp(page, { entries: [bench("2026-01-28", 200, 3), bench("2026-02-18", 165, 8), bench("2026-02-25", 165, 8), bench("2026-02-25", 165, 7),
    set({ date: "2026-02-25", exercise: "Biceps curl", muscle: "Biceps", weight: 20, reps: 10, variant: { equip: "Dumbbell" } })] });
  const r = await page.evaluate(async () => (await import("/js/suggest.js")).nextSet("Bench press", "2026-03-04"));
  expect(r.prText).toBe("Your PR is 200 × 3 (Jan 28).");   // missed a rep last time: no attempt today
  // With all reps done, the smallest PR is suggested.
  const r2 = await page.evaluate(async () => { const { prTry } = await import("/js/suggest.js"); return prTry("Bench press", 8, 165); });
  expect(r2).toMatchObject({ weight: 175, reps: 8 });
  const r3 = await page.evaluate(async () => { const { prTry } = await import("/js/suggest.js"); return prTry("Bench press", 3, 200); });
  expect(r3).toMatchObject({ weight: 205, reps: 3 });   // 225.5 beats 200 × 4 (226.7) as the smaller step
  const r4 = await page.evaluate(async () => { const { prTry } = await import("/js/suggest.js"); return prTry("Biceps curl", 10, 20); });
  expect(r4).toBeNull();   // 25 × 10 is 25% more and 20 × 11 is past 10 reps: no attempt suggested
  expect(errors).toEqual([]);
});

test("the PR is the chosen variant's when you've logged it", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ date: "2026-01-20", exercise: "Lat pulldown", muscle: "Back", weight: 250, reps: 8, variant: { equip: "Plate-loaded" } }),
    ...["2026-02-18", "2026-02-25"].map(d => set({ date: d, exercise: "Lat pulldown", muscle: "Back", weight: 140, reps: 10, variant: { equip: "Cable", attach: "Lat pulldown bar", width: "Wide", grip: "Overhand" } })),
  ] });
  await pickExercise(page, "Lat pulldown");
  await expect(page.locator("#sug")).toContainText("Your PR is 140 × 10 (Feb 18)");
  expect(errors).toEqual([]);
});
