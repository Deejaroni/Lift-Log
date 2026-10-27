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
