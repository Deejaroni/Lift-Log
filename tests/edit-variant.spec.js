// The set editor can change a logged set's variant (equipment, attachment, grip, position...) without deleting it.
const { test, expect } = require("@playwright/test");
const { openApp, set } = require("./helpers");

const day = "#day-list";
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1") || "[]"));
const bench = (o = {}) => set({ id: "b1", exercise: "Bench press", muscle: "Chest", weight: 135, reps: 8,
  variant: { equip: "Barbell", pos: "Flat" }, equip: { barbell: { type: "Olympic", mode: "plates" } }, ...o });

test("switching a logged set from barbell to dumbbell changes its variant and setup", async ({ page }) => {
  const errors = await openApp(page, { entries: [bench()] });
  await page.click(`${day} [data-tap="b1"]`);
  const ed = page.locator(`${day} .edit-box`);
  await expect(ed.locator(".ed-lbl", { hasText: "Setup" })).toHaveCount(1);
  const chips = ed.locator(".ed-vchips .vchip");
  await expect(chips.filter({ hasText: "Barbell" })).toHaveCount(1);
  await expect(ed.locator(".ed-vedit")).toBeHidden();
  await chips.filter({ hasText: "Barbell" }).click();
  await expect(ed.locator(".ed-vedit")).toBeVisible();
  await ed.locator('.ed-vedit [data-dim="equip"][data-val="Dumbbell"]').click();
  await expect(chips.filter({ hasText: "Dumbbell" })).toHaveCount(1);
  await expect(ed.locator(".ed-vedit")).toBeHidden();
  await expect(ed.locator(".ed-eq-sum")).not.toContainText("Barbell");
  await ed.locator("[data-edit-save]").click();
  await expect(ed).toHaveCount(0);
  const [e] = await stored(page);
  expect(e.exercise).toBe("Bench press");
  expect(e.variant).toMatchObject({ equip: "Dumbbell", pos: "Flat" });
  expect(e.equip.barbell).toBeUndefined();
  expect(e).toMatchObject({ weight: 135, reps: 8 });
  expect(errors).toEqual([]);
});

test("a detail can be added or cleared, and Cancel keeps the old variant", async ({ page }) => {
  const errors = await openApp(page, { entries: [bench()] });
  await page.click(`${day} [data-tap="b1"]`);
  const ed = page.locator(`${day} .edit-box`);
  await ed.locator(".ed-vchips .vchip", { hasText: "Flat" }).click();
  await ed.locator('.ed-vedit [data-dim="pos"][data-val="Flat"]').click();   // tapping the chosen one clears it
  await expect(ed.locator(".ed-vchips .vchip", { hasText: "Flat" })).toHaveCount(0);
  await ed.locator("[data-edit-cancel]").click();
  expect((await stored(page))[0].variant).toEqual({ equip: "Barbell", pos: "Flat" });
  await page.click(`${day} [data-tap="b1"]`);
  await expect(page.locator(`${day} .edit-box .ed-vchips .vchip`, { hasText: "Flat" })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("your own exercises have no variant chips in the editor", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "o1", exercise: "My odd lift", muscle: "Other", weight: 50, reps: 10 })] });
  await page.click(`${day} [data-tap="o1"]`);
  await expect(page.locator(`${day} .edit-box`)).toBeVisible();
  await expect(page.locator(`${day} .edit-box .ed-vchips`)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("the Log form's own chips still work after editing a set", async ({ page }) => {
  const errors = await openApp(page, { entries: [bench()] });
  await page.click(`${day} [data-tap="b1"]`);
  await page.locator(`${day} .edit-box .ed-vchips .vchip`, { hasText: "Barbell" }).click();
  await page.locator(`${day} .edit-box [data-edit-cancel]`).click();
  await page.fill("#exercise-search", "bench press");
  await page.click('#ex-results [data-name="Bench press"]');
  await expect(page.locator("#ex-variant .vchip", { hasText: "Barbell" })).toHaveCount(1);
  await expect(page.locator("#ex-vedit")).toBeHidden();
  expect(errors).toEqual([]);
});
