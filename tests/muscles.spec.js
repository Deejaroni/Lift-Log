const { test, expect } = require("@playwright/test");
const { set, openApp, pickExercise } = require("./helpers");

const stored = page => page.evaluate(() => ({
  entries: JSON.parse(localStorage.getItem("liftlog.entries.v1")),
  settings: JSON.parse(localStorage.getItem("liftlog.settings.v1") || "{}"),
}));
const groupsInFilter = (page, sel) => page.locator(`${sel} optgroup`).evaluateAll(gs => Object.fromEntries(gs.map(g => [g.label, [...g.querySelectorAll("option")].map(o => o.value)])));

// Old saved data: the "Legs" group from early versions and no per-exercise settings.
const oldData = () => ({
  entries: [
    set({ id: "r1", date: "2026-03-01", exercise: "Romanian deadlift", muscle: "Legs", weight: 185, reps: 8 }),
    set({ id: "r2", date: "2026-03-02", exercise: "Romanian deadlift", muscle: "Legs", weight: 195, reps: 8 }),
  ],
  settings: { bw: 180, bwUnit: "lb", days: {}, bwLog: {} },
});

test("old data loads, and an exercise's muscle groups can be changed from History", async ({ page }) => {
  const errors = await openApp(page, oldData());
  await page.click('nav.tabs [data-tab="history"]');
  expect(await groupsInFilter(page, "#hist-filter")).toEqual({ Hamstrings: ["Romanian deadlift"] });
  await page.locator('#history [data-exinfo="Romanian deadlift"]').first().click();
  const sheet = page.locator("#exsheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("#exs-main")).toHaveValue("Hamstrings");
  // "Also works" starts from the built-in list.
  await expect(sheet.locator('[data-also="Lower back"]')).toHaveAttribute("aria-pressed", "true");
  await sheet.locator("#exs-main").selectOption("Glutes");
  await sheet.locator('[data-also="Lower back"]').click();
  await sheet.locator('[data-also="Hamstrings"]').click();
  await sheet.locator("#exs-save").click();
  await expect(sheet).toBeHidden();
  expect(await groupsInFilter(page, "#hist-filter")).toEqual({ Glutes: ["Romanian deadlift"] });
  const s = await stored(page);
  expect(s.entries.map(e => e.muscle)).toEqual(["Glutes", "Glutes"]);
  expect(s.settings.exercises["romanian deadlift"]).toEqual({ muscle: "Glutes", also: ["Hamstrings"] });
  await page.click('nav.tabs [data-tab="progress"]');
  expect(await groupsInFilter(page, "#prog-ex")).toEqual({ Glutes: ["Romanian deadlift"] });
  expect(errors).toEqual([]);
});

test("search follows the change: main group first, and listed under its also-works groups", async ({ page }) => {
  const data = oldData();
  data.settings.exercises = { "romanian deadlift": { muscle: "Glutes", also: ["Hamstrings"] } };
  const errors = await openApp(page, data);
  await page.selectOption("#group-filter", "Hamstrings");
  await page.fill("#exercise-search", "romanian deadlift");
  const row = page.locator('#ex-results [data-name="Romanian deadlift"]');
  await expect(row).toContainText("Hamstrings · Also works");
  await expect(page.locator("#ex-results .ex-sec")).toHaveCount(0);   // in the group, not "In other groups"
  await page.selectOption("#group-filter", "Lower back");
  await page.fill("#exercise-search", "romanian deadlift");
  await expect(page.locator("#ex-results .ex-sec")).toHaveText(["In other groups"]);
  await row.click();
  await expect(page.locator("#ex-chosen-meta")).toContainText("Glutes");
  expect(errors).toEqual([]);
});

test("the chosen exercise card opens the same details, and new sets use the new group", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Leg press");
  await page.click("#ex-chosen-text");
  await page.locator("#exs-main").selectOption("Glutes");
  await page.click("#exs-save");
  await expect(page.locator("#ex-chosen-meta")).toContainText("Glutes");
  await page.click("#save");
  expect((await stored(page)).entries[0].muscle).toBe("Glutes");
  expect(errors).toEqual([]);
});

test("Cancel leaves everything as it was", async ({ page }) => {
  const errors = await openApp(page, oldData());
  await page.click('nav.tabs [data-tab="history"]');
  await page.locator('#history [data-exinfo="Romanian deadlift"]').first().click();
  await page.locator("#exs-main").selectOption("Back");
  await page.click("#exs-cancel");
  const s = await stored(page);
  expect(s.entries.map(e => e.muscle)).toEqual(["Legs", "Legs"]);
  expect(s.settings.exercises || {}).toEqual({});
  expect(errors).toEqual([]);
});
