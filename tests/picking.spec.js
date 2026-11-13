const { test, expect } = require("@playwright/test");
const { TODAY, set, openApp, pickExercise } = require("./helpers");

const bench = "Bench press", pull = "Lat pulldown", row = "Seated row";   // parent exercises
const day = "#day-list";
const settingsNow = page => page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.settings.v1")) || {});
const sections = page => page.locator("#ex-results .ex-sec").allTextContents();
const listed = page => page.locator("#ex-results .ex-opt[data-name]").evaluateAll(b => b.map(x => x.dataset.name));

test("star an exercise and it shows first under Favorites", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ date: "2026-03-01", exercise: row, muscle: "Back", weight: 120, reps: 10 }),
    set({ date: "2026-03-02", exercise: bench, muscle: "Chest", weight: 135, reps: 8 }),
  ] });
  await page.click("#exercise-search");
  expect(await sections(page)).toEqual(["Recently used", "Browse by movement"]);
  const star = page.locator(`#ex-results [data-fav="${row}"]`);
  await expect(star).toHaveAttribute("aria-pressed", "false");
  const box = await star.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(40); expect(box.height).toBeGreaterThanOrEqual(40);
  await star.click();
  expect(await sections(page)).toEqual(["Favorites", "Recently used", "Browse by movement"]);
  expect(await listed(page)).toEqual([row, bench]);   // not repeated under Recently used
  await expect(page.locator(`#ex-results [data-fav="${row}"]`)).toHaveAttribute("aria-pressed", "true");
  expect((await settingsNow(page)).favs).toEqual([row]);
  // A favorite from another muscle group stays out of a picked group's list.
  await page.click("#ctx-line");
  await page.selectOption("#group-filter", "Chest");
  await page.click("#exercise-search");
  expect(await sections(page)).not.toContain("Favorites");
  expect(errors).toEqual([]);
});

test("favorite from the how-to sheet; the chosen card shows a star", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, row);
  await expect(page.locator("#ex-chosen-fav")).toBeHidden();
  await page.click("#ex-chosen-text");
  await expect(page.locator("#exs-fav")).toHaveAttribute("aria-pressed", "false");
  await page.click("#exs-fav");
  await expect(page.locator("#exs-fav")).toHaveAttribute("aria-pressed", "true");
  await page.click("#exs-close");
  await expect(page.locator("#ex-chosen-fav")).toBeVisible();
  await expect(page.locator("#ex-chosen-name")).toHaveText(row);
  expect((await settingsNow(page)).favs).toEqual([row]);
  expect(errors).toEqual([]);
});

test("settings saved before favorites load fine, and renaming carries the star", async ({ page }) => {
  const errors = await openApp(page, { settings: { bw: 180, bwUnit: "lb", days: {}, bwLog: {} }, entries: [set({ exercise: "Pec dec", muscle: "Chest", weight: 100, reps: 10 })] });
  await page.click("#exercise-search");
  await expect(page.locator("#ex-results .ex-sec").first()).toHaveText("Recently used");
  expect(await page.evaluate(async () => (await import("/js/state.js")).settings.favs)).toEqual([]);
  await page.click('#ex-results [data-fav="Pec dec"]');
  await page.evaluate(async () => { const s = await import("/js/state.js"); s.renameExercise("pec dec", "Pec deck"); });
  expect(await page.evaluate(async () => (await import("/js/state.js")).settings.favs)).toEqual(["Pec deck"]);
  expect(errors).toEqual([]);
});

test("a row of today's exercises switches between them", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ exercise: bench, muscle: "Chest", weight: 135, reps: 8, ts: 1 }), set({ exercise: bench, muscle: "Chest", weight: 135, reps: 8, ts: 2 }),
    set({ exercise: pull, muscle: "Back", weight: 120, reps: 10, ts: 3 }),
    set({ date: "2026-03-02", exercise: row, muscle: "Back", weight: 100, reps: 10 }),
  ] });
  const chips = page.locator("#today-row button");
  await expect(chips.locator("b")).toHaveText([bench, pull]);
  await expect(chips.locator("span")).toHaveText(["2 sets", "1 set"]);
  const box = await chips.first().boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await chips.first().click();
  await expect(page.locator("#ex-chosen-name")).toHaveText(bench);
  await expect(page.locator("#weight")).toHaveValue("135");
  await expect(chips.first()).toHaveAttribute("aria-current", "true");
  // Another day has its own row; with nothing logged there is none.
  await page.click("#ctx-line");
  await page.fill("#date", "2026-03-03");
  await expect(page.locator("#today-row")).toBeHidden();
  expect(errors).toEqual([]);
});

const plan = { name: "P", template: "x", mode: "fixed", days: [null, null, "w1", null, null, null, null], rotation: [], start: "2026-03-02", done: {}, override: null, deloadEvery: 0,
  prog: { on: false, upper: 5, lower: 10, unit: "lb" }, workouts: [{ id: "w1", name: "Upper", items: [{ exercise: bench, sets: 2, lo: 6, hi: 8 }, { exercise: pull, sets: 3, lo: 8, hi: 12 }] }] };

test("planned exercises show in the row, and the last planned set picks the next one", async ({ page }) => {
  const errors = await openApp(page, { settings: { program: plan }, entries: [
    set({ exercise: bench, muscle: "Chest", weight: 135, reps: 8 }),
    set({ date: "2026-02-25", exercise: pull, muscle: "Back", weight: 120, reps: 10 }),
  ] });
  const chips = page.locator("#today-row button");
  await expect(chips.locator("b")).toHaveText([bench, pull]);
  await expect(chips.locator("span")).toHaveText(["1 of 2", "Planned · 3 × 8–12"]);
  await expect(chips.nth(1)).toHaveClass(/plan/);
  await pickExercise(page, bench);
  await page.fill("#weight", "135"); await page.fill("#reps", "8");
  await page.click("#save");
  // The form resets and picks the next planned exercise, filled in from the plan.
  await expect(page.locator("#ex-chosen-name")).toHaveText(pull);
  await expect(page.locator("#ex-next-tag")).toBeVisible();
  await expect(page.locator("#weight")).toHaveValue("120");
  await expect(page.locator("#sets")).toHaveValue("3");
  await expect(page.locator("#ctx-line")).toContainText("All muscle groups");
  await expect(page.locator("#msg")).toContainText("Up next: Lat pulldown, 3 × 8–12 at 120 lb");
  await expect(chips.locator("span")).toHaveText(["2 of 2 ✓", "Planned · 3 × 8–12"]);
  // Nothing was logged for it yet; Change drops the tag.
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1")))).filter(e => e.date === "2026-03-04").length).toBe(2);
  await page.click("#ex-change");
  await expect(page.locator("#ex-next-tag")).toBeHidden();
  expect(errors).toEqual([]);
});

test("logging an unplanned set doesn't switch exercises", async ({ page }) => {
  const errors = await openApp(page, { settings: { program: plan } });
  await pickExercise(page, row);
  await page.fill("#weight", "100");
  await page.click("#save");
  await expect(page.locator("#ex-find")).toBeVisible();
  await expect(page.locator("#ex-next-tag")).toBeHidden();
  expect(errors).toEqual([]);
});

test("search lists your exercises first, then the library's best 8", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ date: "2026-02-20", exercise: "Bent-over row", muscle: "Back", weight: 135, reps: 8 }),
    set({ date: "2026-02-21", exercise: row, muscle: "Back", weight: 120, reps: 10 }),
  ] });
  await page.fill("#exercise-search", "row");
  expect(await sections(page)).toEqual(["Yours", "From the library"]);
  const names = await listed(page);
  expect(names.slice(0, 2).sort()).toEqual(["Bent-over row", row].sort());
  expect(names.length).toBe(2 + 8);
  // (With versions grouped under parents, "row" has exactly 8 more, so no "Show all" here.)
  // Enter takes the top match, which is one of yours.
  await page.press("#exercise-search", "Enter");
  expect([row, "Bent-over row"]).toContain(await page.locator("#ex-chosen-name").textContent());
  expect(errors).toEqual([]);
});

test("with nothing logged, search shows the library's best 8 without headings", async ({ page }) => {
  const errors = await openApp(page);
  await page.fill("#exercise-search", "row");
  expect(await sections(page)).toEqual([]);
  expect((await listed(page)).length).toBe(8);
  expect(errors).toEqual([]);
});
