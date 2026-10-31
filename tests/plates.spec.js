const { test, expect } = require("@playwright/test");
const { openApp, pickExercise } = require("./helpers");

const plates = page => page.locator("#plates .plate").allTextContents();

test("a barbell shows plates per side, assuming a standard bar when none is set", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Barbell bench press — flat");
  await page.fill("#weight", "225");
  await expect(page.locator("#plates")).toContainText("Per side (45 lb bar)");
  expect(await plates(page)).toEqual(["45", "45"]);
  await page.fill("#weight", "185");
  await expect(page.locator("#plates .plate")).toHaveCount(2);
  expect(await plates(page)).toEqual(["45", "25"]);
  expect(errors).toEqual([]);
});

test("weights that can't be loaded exactly say how far under the closest load is", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Barbell bench press — flat");
  await page.fill("#weight", "138");
  await expect(page.locator("#plates")).toContainText("3 lb under");
  expect(await plates(page)).toEqual(["45"]);
  await page.fill("#weight", "45");
  await expect(page.locator("#plates")).toContainText("Just the bar");
  expect(errors).toEqual([]);
});

test("a Smith machine set to plates only splits the entered weight", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Smith machine squat");
  await page.fill("#weight", "90");
  await expect(page.locator("#plates")).toContainText("Per side");
  expect(await plates(page)).toEqual(["45"]);
  expect(errors).toEqual([]);
});

test("kilograms use kilogram plates", async ({ page }) => {
  const errors = await openApp(page, { prefs: { unit: "kg" } });
  await pickExercise(page, "Barbell bench press — flat");
  await page.fill("#weight", "100");
  await expect(page.locator("#plates")).toContainText("Per side (20 kg bar)");
  expect(await plates(page)).toEqual(["25", "15"]);
  expect(errors).toEqual([]);
});

test("no plate line without a barbell or Smith machine", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Leg press");
  await page.fill("#weight", "300");
  await expect(page.locator("#plates")).toBeHidden();
  expect(errors).toEqual([]);
});
