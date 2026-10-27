const { test, expect } = require("@playwright/test");
const { set, openApp } = require("./helpers");

test("the Plan tab lists training days with today's checklist", async ({ page }) => {
  // 2026-03-04 is a Wednesday: Legs in the Push / Pull / Legs template, which trains Mon–Sat.
  const squats = [1, 2, 3, 4].map(() => set({ exercise: "High-bar back squat", muscle: "Legs", weight: 185, reps: 8 }));
  const errors = await openApp(page, { entries: squats });
  await page.click('nav.tabs [data-tab="plan"]');
  await page.click('[data-tpl="ppl"]');
  const days = page.locator(".agenda .ag-day");
  await expect(days).toHaveCount(6);
  await expect(days.first()).toContainText("Mon · Push");
  const todayCard = page.locator(".agenda .ag-day.today");
  await expect(todayCard).toContainText("Wed · Legs");
  await expect(todayCard).toContainText("Today · 1 of 6");
  await expect(todayCard.locator(".ag-ex")).toHaveCount(6);
  await expect(todayCard.locator(".ag-ex.done")).toHaveText(/High-bar back squat/);
  await expect(todayCard.locator(".ag-ex.now")).toHaveText(/Romanian deadlift/);
  await expect(page.locator(".agenda .ag-rest")).toHaveText("Sun is a rest day");
  expect(errors).toEqual([]);
});
