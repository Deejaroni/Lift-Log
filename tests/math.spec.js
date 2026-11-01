const { test, expect } = require("@playwright/test");
const { set, cardio, openApp, bodyWeight } = require("./helpers");

const day = "#day-list";
const dayVolume = page => page.locator(`${day} .day-total .stat`, { hasText: "lifted" }).locator(".num");

test("one-side sets count double toward volume", async ({ page }) => {
  await openApp(page, { entries: [set({ exercise: "Single-arm cable row", muscle: "Back", weight: 50, reps: 10, equip: { cable: { side: "One side (unilateral)" } } })] });
  // 50 lb × 10 reps × 2 sides
  await expect(page.locator(`${day} .ex-head .vol`)).toHaveText("1 set · 1,000 lb");
  await expect(dayVolume(page)).toHaveText("1,000");
  await expect(page.locator(`${day} .eq-line`).first()).toContainText("volume ×2 (each side)");
});

test("Smith machine adds the bar by default", async ({ page }) => {
  await openApp(page, { entries: [set({ exercise: "Smith machine squat", muscle: "Quadriceps", weight: 100, reps: 5, equip: { smith: { bar: 25 } } })] });
  // 100 lb plates + 25 lb bar = 125 lb load; × 5 reps = 625
  await expect(page.locator(`${day} .set .num`)).toHaveText("125 lb × 5");
  await expect(page.locator(`${day} .set .note`)).toContainText("25 lb bar added");
  await expect(page.locator(`${day} .set .note`)).toContainText("100 lb plates + 25 lb bar");
  await expect(dayVolume(page)).toHaveText("625");
});

test("estimated 1RM uses Epley", async ({ page }) => {
  await openApp(page, { entries: [set({ exercise: "Barbell bench press — flat", muscle: "Chest", weight: 200, reps: 5 })] });
  await page.click('nav.tabs [data-tab="progress"]');
  // 200 × (1 + 5/30) = 233.33
  await expect(page.locator("#prog-stats .stat", { hasText: "Best est. 1RM" }).locator(".num")).toHaveText("233.3");
  await expect(page.locator("#prog-stats .stat", { hasText: "Best lb" }).locator(".num")).toHaveText("200");
});

test("DOTS score for a known case", async ({ page }) => {
  // Men's DOTS, 100 kg body weight, 600 kg total (singles, so est. 1RM = weight lifted) = 369.31
  await openApp(page, {
    prefs: { unit: "kg" },
    settings: bodyWeight(100, "kg", { profile: { std: "men" } }),
    entries: [
      set({ exercise: "High-bar back squat", muscle: "Quadriceps", weight: 200, unit: "kg", reps: 1 }),
      set({ exercise: "Barbell bench press — flat", muscle: "Chest", weight: 150, unit: "kg", reps: 1 }),
      set({ exercise: "Conventional deadlift", muscle: "Full body", weight: 250, unit: "kg", reps: 1 }),
    ],
  });
  await page.click('nav.tabs [data-tab="progress"]');
  await expect(page.locator("#std-panel .stat", { hasText: "DOTS score" }).locator(".num")).toHaveText("369");
  await expect(page.locator("#std-panel .stat", { hasText: "Est. total" }).locator(".num")).toHaveText("600");
});

test("lifting calories from set count", async ({ page }) => {
  // 4 sets → 10 min, 0.4 sets/min → moderate (3.5 MET). 3.5 × 70 kg × 10 / 60 = 40.8
  await openApp(page, {
    settings: bodyWeight(70, "kg"),
    entries: [1, 2, 3, 4].map(() => set({ exercise: "Seated cable row", muscle: "Back", weight: 100, reps: 10 })),
  });
  await expect(page.locator(`${day} .cal-main .num`)).toHaveText("≈ 41");
  await expect(page.locator(`${day} .cal`)).toContainText("Lifting ≈ 41: Moderate (auto), 10 min estimated from 4 sets");
});

test("cardio calories from effort", async ({ page }) => {
  // Stationary bike, moderate = 6.8 MET. 6.8 × 70 kg × 30 / 60 = 238
  await openApp(page, {
    settings: bodyWeight(70, "kg"),
    entries: [cardio({ exercise: "Stationary bike", minutes: 30 })],
  });
  await expect(page.locator(`${day} .cardio-kcal`)).toHaveText("≈ 238 cal");
  await expect(page.locator(`${day} .cardio-row`)).toContainText("Estimate from effort");
  await expect(page.locator(`${day} .cal`)).toContainText("Cardio ≈ 238: 30 min");
});

test("per-hand dumbbells and two kettlebells count double, and never four times", async ({ page }) => {
  await openApp(page);
  const v = await page.evaluate(async () => {
    const { volOf } = await import("/js/log.js");
    const s = equip => volOf({ weight: 50, unit: "lb", reps: 10, equip });
    return [s({ db: { each: true } }), s({ kb: { count: "Two kettlebells", each: true } }), s({ kb: { count: "One kettlebell", each: true } }),
      s({ db: { each: true, side: "One side (unilateral)" } }), s(null)];
  });
  expect(v).toEqual([1000, 1000, 500, 1000, 500]);
});

test("cardio calories prefer watts, then speed and incline", async ({ page }) => {
  await openApp(page, { settings: bodyWeight(80, "kg") });
  const k = await page.evaluate(async () => {
    const { cardioKcal } = await import("/js/equipment.js");
    const day = "2026-03-04", c = o => cardioKcal({ kind: "cardio", date: day, exercise: "Treadmill", minutes: 30, effort: "moderate", ...o });
    return [cardioKcal({ kind: "cardio", date: day, exercise: "Stationary bike", minutes: 30, effort: "moderate", extra: { watts: 150 } }),
      c({ extra: { speed: 3, speedUnit: "mph", incline: 5 } }), c({ extra: { speed: 6, speedUnit: "mph" } })];
  });
  // 150 W × 30 min = 270 kJ ≈ 270 kcal.
  expect(k[0]).toEqual({ kcal: 270, method: "from watts" });
  // Walking at 3 mph (80.47 m/min), 5% grade: VO2 = 3.5 + 0.1·v + 1.8·v·0.05 = 18.79 mL/kg/min; × 80 kg × 5 kcal/L × 30 min ÷ 1000.
  expect(k[1].method).toBe("from speed & incline");
  expect(k[1].kcal).toBeCloseTo(225.5, 0);
  // Running at 6 mph (160.93 m/min): VO2 = 3.5 + 0.2·v = 35.69; × 80 × 5 × 30 ÷ 1000.
  expect(k[2].method).toBe("from speed");
  expect(k[2].kcal).toBeCloseTo(428.2, 0);
});

test("body weight is that day's record, else the latest earlier one", async ({ page }) => {
  await openApp(page, { settings: { bw: 190, bwUnit: "lb", days: {}, bwLog: { "2026-02-01": { w: 80, unit: "kg" }, "2026-03-01": { w: 82, unit: "kg" } } } });
  const kg = await page.evaluate(async () => { const { bwKgOn } = await import("/js/state.js"); return ["2026-03-01", "2026-03-04", "2026-02-15"].map(bwKgOn); });
  expect(kg).toEqual([82, 82, 80]);
});

test("strength scores are age-adjusted 1% per year past 40", async ({ page }) => {
  await openApp(page, { settings: bodyWeight(80, "kg", { profile: { std: "men", birthYear: 1976 } }) });
  const f = await page.evaluate(async () => { const { ageFactor, ageNow } = await import("/js/standards.js"); return [ageNow(), ageFactor()]; });
  // 2026 − 1976 = 50, 10 years past 40.
  expect(f[0]).toBe(50);
  expect(f[1]).toBeCloseTo(1.10, 5);
});
