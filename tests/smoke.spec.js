const { test, expect } = require("@playwright/test");
const { set, openApp, pickExercise } = require("./helpers");

const day = "#day-list";

test("every tab opens", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ exercise: "Seated cable row", muscle: "Back", weight: 100, reps: 10 })] });
  for (const tab of ["plan", "history", "progress", "log"]) {
    await page.click(`nav.tabs [data-tab="${tab}"]`);
    await expect(page.locator(`#tab-${tab}`)).toBeVisible();
    await expect(page.locator(`nav.tabs [data-tab="${tab}"]`)).toHaveAttribute("aria-selected", "true");
  }
  await page.click('nav.tabs [data-tab="history"]');
  await expect(page.locator("#history")).toContainText("Seated cable row");
  await page.click('nav.tabs [data-tab="progress"]');
  await expect(page.locator("#ex-chart")).toBeVisible();
  expect(errors).toEqual([]);
});

test("log a straight set with a failure mark", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Barbell bench press — flat");
  await page.fill("#weight", "135");
  await page.fill("#reps", "8");
  await page.fill("#sets", "2");
  const chip = page.locator('#fail-chips [data-fset="1"]');
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await page.click("#save");
  await expect(page.locator("#msg")).toContainText("Logged 2 × 8 @ 135 lb");
  await expect(page.locator(`${day} .set`)).toHaveCount(2);
  await expect(page.locator(`${day} .set.failed`)).toHaveCount(1);
  await expect(page.locator(`${day} .set.failed .fail-badge`)).toHaveText("F");
  await expect(page.locator(`${day} .set .num`).first()).toHaveText("135 lb × 8");
  expect(errors).toEqual([]);
});

test("log a drop set", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Leg press");
  await page.fill("#weight", "200");
  await page.fill("#reps", "10");
  await page.click('.mode [data-mode="drop"]');
  await page.click("#add-down");
  await page.click("#add-down");
  await expect(page.locator("#save")).toHaveText("Log drop set");
  await page.click("#save");
  await expect(page.locator(`${day} .chain .tag`)).toHaveText("Drop set · 3");
  await expect(page.locator(`${day} .chain-steps`)).toHaveText("200×10→160×10→120×10");
  expect(errors).toEqual([]);
});

test("log a cardio entry", async ({ page }) => {
  const errors = await openApp(page);
  await page.selectOption("#group-filter", "Cardio");
  await pickExercise(page, "Treadmill");
  await expect(page.locator("#save")).toHaveText("Log cardio");
  await page.fill("#c-min", "25");
  await page.click("#save");
  await expect(page.locator(`${day} .cardio-row`)).toContainText("25 min");
  await expect(page.locator(`${day} .ex-head h3`)).toHaveText("Treadmill");
  expect(errors).toEqual([]);
});

test("edit and delete an entry", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "e1", exercise: "Seated cable row", muscle: "Back", weight: 100, reps: 10 })] });
  await expect(page.locator(`${day} .set .num`)).toHaveText("100 lb × 10");

  await page.click(`${day} [data-edit="e1"]`);
  await page.fill(`${day} .edit-box [data-ef="reps"]`, "12");
  await page.click(`${day} [data-edit-save="e1"]`);
  await expect(page.locator(`${day} .set .num`)).toHaveText("100 lb × 12");

  await page.click(`${day} [data-del="e1"]`);
  await expect(page.locator("#dlg")).toBeVisible();
  await expect(page.locator("#dlg-msg")).toHaveText("Delete this set?");
  await page.click("#dlg-ok");
  await expect(page.locator(`${day} .empty`)).toHaveText("Nothing logged for this day yet.");
  expect(errors).toEqual([]);
});

test("open Settings", async ({ page }) => {
  const errors = await openApp(page);
  await page.click("#open-settings");
  await expect(page.locator("#settings")).toBeVisible();
  await expect(page.locator("#settings-title")).toHaveText("Settings");
  await expect(page.locator("#app-version")).toHaveText(/^Version \S+/);
  await page.click("#settings-done");
  await expect(page.locator("#settings")).toBeHidden();
  expect(errors).toEqual([]);
});

test("load a Plan template", async ({ page }) => {
  const errors = await openApp(page);
  await page.click('nav.tabs [data-tab="plan"]');
  await page.click('[data-tpl="ppl"]');
  await expect(page.locator("#plan-root h2").first()).toHaveText("Push / Pull / Legs");
  await page.click('nav.tabs [data-tab="log"]');
  // 2026-03-04 is a Wednesday, which the template schedules as Legs.
  await expect(page.locator("#plan-today h2")).toHaveText("Legs");
  await expect(page.locator("#plan-today")).toContainText("Week 1");
  expect(errors).toEqual([]);
});
