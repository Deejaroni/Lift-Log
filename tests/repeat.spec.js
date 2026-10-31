const { test, expect } = require("@playwright/test");
const { TODAY, set, cardio, openApp } = require("./helpers");

const PAST = "2026-03-02";
const pastDay = () => [
  set({ date: PAST, exercise: "Barbell bench press — flat", muscle: "Chest", weight: 135, reps: 10, equip: { barbell: { type: "Straight bar" } } }),
  set({ date: PAST, exercise: "Barbell bench press — flat", muscle: "Chest", weight: 155, reps: 8, equip: { barbell: { type: "Straight bar" } } }),
  set({ date: PAST, exercise: "Barbell bench press — flat", muscle: "Chest", weight: 155, reps: 8, equip: { barbell: { type: "Straight bar" } } }),
  set({ date: PAST, exercise: "Pec deck", muscle: "Chest", weight: 90, reps: 12 }),
  cardio({ date: PAST, exercise: "Treadmill", minutes: 20 }),
];

async function repeatPast(page) {
  await page.click('nav.tabs [data-tab="history"]');
  await page.click(`#history [data-repeat="${PAST}"]`);
}

test("Repeat on a past day lists its exercises on the Log tab", async ({ page }) => {
  const errors = await openApp(page, { entries: pastDay() });
  await page.click('nav.tabs [data-tab="history"]');
  // Today has no Repeat button; past days do.
  await expect(page.locator(`#history [data-repeat="${TODAY}"]`)).toHaveCount(0);
  await repeatPast(page);
  await expect(page.locator("#tab-log")).toBeVisible();
  const card = page.locator("#repeat-today");
  await expect(card).toContainText("Repeat Mon, Mar 2");
  await expect(card.locator(".pi-name")).toHaveText(["Barbell bench press — flat", "Pec deck", "Treadmill"]);
  await expect(card.locator(".tag")).toHaveText(["0/3", "0/1", "—"]);
  expect(errors).toEqual([]);
});

test("Start fills in the exercise, top weight, reps and sets left, and logging counts toward it", async ({ page }) => {
  const errors = await openApp(page, { entries: pastDay() });
  await repeatPast(page);
  await page.click('#repeat-today [data-repeat-start="0"]');
  await expect(page.locator("#ex-chosen-name")).toHaveText("Barbell bench press — flat");
  await expect(page.locator("#weight")).toHaveValue("155");
  await expect(page.locator("#reps")).toHaveValue("8");
  await expect(page.locator("#sets")).toHaveValue("3");
  await expect(page.locator("#equip-sum-text")).toContainText("Barbell");
  await page.fill("#sets", "1");
  await page.click("#save");
  await expect(page.locator("#repeat-today .tag").first()).toHaveText("1/3");
  await page.click('#repeat-today [data-repeat-start="0"]');
  await expect(page.locator("#sets")).toHaveValue("2");
  await page.click('#repeat-today [data-repeat-start="2"]');
  await expect(page.locator("#c-min")).toHaveValue("20");
  expect(errors).toEqual([]);
});

test("the Repeat card can be closed, and isn't shown on a later day", async ({ page }) => {
  const errors = await openApp(page, { entries: pastDay() });
  await repeatPast(page);
  await page.click("#repeat-today [data-repeat-close]");
  await expect(page.locator("#repeat-today")).toBeHidden();
  await page.reload();
  await expect(page.locator("#repeat-today")).toBeHidden();
  // A repeat started yesterday doesn't carry over.
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("liftlog.prefs.v1")); p.repeat = { on: "2026-03-03", from: "2026-03-02", items: [{ exercise: "Pec deck", weight: 90, unit: "lb", reps: 12, sets: 1 }] }; localStorage.setItem("liftlog.prefs.v1", JSON.stringify(p)); });
  await page.reload();
  await expect(page.locator("#repeat-today")).toBeHidden();
  expect(errors).toEqual([]);
});

test("Start on a planned exercise scrolls to the log form", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ date: "2026-02-01", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 })] });
  await page.click('nav.tabs [data-tab="plan"]');
  await page.click('[data-tpl="ppl"]');
  await page.click('nav.tabs [data-tab="log"]');
  await page.click('#plan-today [data-plan-start="1"]');
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById("log-form").getBoundingClientRect().top))).toBeLessThan(40);
  expect(errors).toEqual([]);
});
