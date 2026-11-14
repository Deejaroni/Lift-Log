const { test, expect } = require("@playwright/test");
const { TODAY, set, openApp, pickExercise } = require("./helpers");

const bench = "Bench press";   // a parent exercise
const day = "#day-list";
const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1")));
const session = (date, reps, weight = 135, extra = {}) => reps.map(r => set({ date, exercise: bench, muscle: "Chest", weight, reps: r, ...extra }));

test("date and muscle group fold into one line that opens when tapped", async ({ page }) => {
  const errors = await openApp(page);
  await expect(page.locator("#ctx-line")).toContainText("Today · All muscle groups");
  await expect(page.locator("#ctx-fields")).toBeHidden();
  const box = await page.locator("#ctx-line").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.click("#ctx-line");
  await expect(page.locator("#ctx-fields")).toBeVisible();
  await page.selectOption("#group-filter", "Chest");
  await page.fill("#date", "2026-03-02");
  await expect(page.locator("#ctx-line")).toContainText("Mon, Mar 2 · Chest");
  // Logging resets the form: the line closes and goes back to all muscle groups (the date is kept).
  await pickExercise(page, bench);
  await page.fill("#weight", "100");
  await page.click("#save");
  await expect(page.locator("#ctx-fields")).toBeHidden();
  await expect(page.locator("#ctx-line")).toContainText("Mon, Mar 2 · All muscle groups");
  expect(errors).toEqual([]);
});

test("Last shows every set from last time", async ({ page }) => {
  const errors = await openApp(page, { entries: [...session("2026-02-25", [8, 8, 7]), set({ date: "2026-02-25", exercise: bench, muscle: "Chest", weight: 155, reps: 3 })] });
  await pickExercise(page, bench);
  await expect(page.locator("#w-last")).toHaveText("Last 135 × 8, 8, 7 · 155 × 3");
  expect(errors).toEqual([]);
});

test("a suggestion chip proposes the next set, and Use fills it in", async ({ page }) => {
  const errors = await openApp(page, { entries: [...session("2026-02-20", [8, 8, 8]), ...session("2026-02-25", [8, 8, 8])] });
  await pickExercise(page, bench);
  await expect(page.locator("#weight")).toHaveValue("135");   // the form keeps last time's numbers
  await expect(page.locator("#sug b")).toHaveText("Try 140 × 8PR");   // 140 × 8 beats the 135 × 8 PR
  await expect(page.locator("#sug")).toContainText("You got all 8 reps on every set last time.");
  const box = await page.locator("#sug-use").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.click("#sug-use");
  await expect(page.locator("#weight")).toHaveValue("140");
  await expect(page.locator("#reps")).toHaveValue("8");
  // The chip stays (with the reason and your PR); only Use goes, since the form already has it.
  await expect(page.locator("#sug")).toBeVisible();
  await expect(page.locator("#sug-use")).toBeHidden();
  expect(errors).toEqual([]);
});

test("suggestions follow missed reps, long breaks and the plan, and start after one session", async ({ page }) => {
  const program = { name: "P", template: "x", mode: "fixed", days: [null, null, "w1", null, null, null, null], rotation: [], start: "2026-03-02", done: {}, override: null, deloadEvery: 0,
    prog: { on: true, upper: 5, lower: 10, unit: "lb" }, workouts: [{ id: "w1", name: "Upper", items: [{ exercise: "Seated row", sets: 3, lo: 8, hi: 12 }] }] };
  const errors = await openApp(page, { settings: { program }, entries: [
    ...session("2026-02-20", [8, 8, 8]), ...session("2026-02-25", [8, 8, 7]),
    ...["2025-12-01", "2026-01-10"].flatMap(d => [6, 6].map(r => set({ date: d, exercise: "Barbell overhead press", muscle: "Shoulders", weight: 95, reps: r }))),
    ...["2026-02-23", "2026-02-27"].flatMap(d => [12, 12, 12].map(r => set({ date: d, exercise: "Seated cable row", muscle: "Back", weight: 120, reps: r }))),
    set({ date: "2026-02-27", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 }),
  ] });
  const r = await page.evaluate(async () => {
    const { nextSet } = await import("/js/suggest.js");
    const { parentOf } = await import("/js/parents.js");   // old names are now parents with variants
    const t = n => { const s = nextSet(parentOf(n), "2026-03-04"); return s && { title: s.title, why: s.why }; };
    return { missed: t("Barbell bench press — flat"), back: t("Barbell overhead press"), plan: t("Seated cable row"), once: t("Leg press"), never: t("Hack squat") };
  });
  expect(r.missed).toEqual({ title: "Stay at 135 × 8", why: "Last time: 8, 8, 7. Get all 8, then add weight." });
  expect(r.back).toEqual({ title: "Try 85 × 6", why: "Back after 7 weeks: start a little lighter." });
  expect(r.plan).toEqual({ title: "Try 125 × 8", why: "Plan: 3 × 8–12. +5 lb: you hit 12 reps on all 3 sets last time." });
  expect(r.once).toEqual({ title: "Try 310 × 10", why: "You got 10 reps last time." });   // one session is enough
  expect(r.never).toBeNull();
  expect(errors).toEqual([]);
});

test("Repeat last set logs the same set again, details included", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "a", exercise: bench, muscle: "Chest", weight: 135, reps: 8, rir: 2, equip: { barbell: { type: "Straight bar" } }, ts: 1000 })] });
  await expect(page.locator("#repeat-last")).toBeVisible();
  await expect(page.locator("#repeat-last")).toContainText("135 × 8");
  await expect(page.locator("#repeat-last")).toContainText(bench);
  await page.click("#repeat-last");
  await expect(page.locator(`${day} .set .num`)).toHaveText(["135 lb × 8", "135 lb × 8"]);
  const list = await stored(page);
  expect(list.length).toBe(2);
  expect(list[1]).toMatchObject({ exercise: bench, weight: 135, reps: 8, rir: 2, equip: { barbell: { type: "Straight bar" } }, date: TODAY });
  expect(list[1].id).not.toBe("a");
  expect(errors).toEqual([]);
});

test("Repeat last set is hidden until something is logged that day", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ date: "2026-03-01", exercise: bench, muscle: "Chest", weight: 135, reps: 8 })] });
  await expect(page.locator("#repeat-last")).toBeHidden();
  expect(errors).toEqual([]);
});

test("tap a set to edit everything about it", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "e1", exercise: "Lat pulldown — wide overhand", muscle: "Back", weight: 120, reps: 9, note: "Seat 4", equip: { cable: { attach: "Lat pulldown bar" } } })] });
  // No Edit or Delete buttons on the row: the row itself opens the editor.
  await expect(page.locator(`${day} .set [data-edit]`)).toBeHidden();
  await expect(page.locator(`${day} .set [data-del]`)).toBeHidden();
  await page.click(`${day} [data-tap="e1"]`);
  const ed = page.locator(`${day} .edit-box`);
  await expect(ed).toBeVisible();
  await ed.locator('[data-estep="reps"][data-dir="1"]').click();
  await expect(ed.locator('[data-ef="reps"]')).toHaveValue("10");
  await ed.locator('[data-ef="failure"]').check({ force: true });
  await ed.locator('[data-erir="1"]').click();
  await ed.locator("[data-ed-eq]").click();
  await ed.locator('[data-eqk="cable"][data-eqf="attach"]').selectOption("Straight bar");
  await ed.locator("label.tog", { hasText: "Pin-select machine" }).click();   // switching on another piece keeps what was typed
  await expect(ed.locator('[data-eqk="cable"][data-eqf="attach"]')).toHaveValue("Straight bar");
  await ed.locator("label.tog", { hasText: "Pin-select machine" }).click();
  await ed.locator("[data-edit-save]").click();
  await expect(page.locator(`${day} .set .num`)).toHaveText("120 lb × 10F");
  const [e] = await stored(page);
  expect(e).toMatchObject({ reps: 10, failure: true, rir: 1, note: "Seat 4", equip: { cable: { attach: "Straight bar" } } });
  expect(e.equip.pin).toBeUndefined();
  expect(errors).toEqual([]);
});

test("the set editor deletes with Undo, and More holds exercise and date", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "e1", exercise: "Seated cable row", muscle: "Back", weight: 100, reps: 10, rir: 2 })] });
  await page.click(`${day} [data-tap="e1"]`);
  await expect(page.locator(`${day} .edit-box [data-ef="date"]`)).toBeHidden();
  await page.click(`${day} .edit-box [data-ed-more]`);
  await expect(page.locator(`${day} .edit-box [data-ef="date"]`)).toBeVisible();
  // Tapping the chosen RIR again clears it.
  await page.click(`${day} .edit-box [data-erir="2"]`);
  await page.click(`${day} .edit-box [data-edit-save]`);
  expect((await stored(page))[0].rir).toBeUndefined();
  await page.click(`${day} [data-tap="e1"]`);
  await page.click(`${day} .edit-box [data-del="e1"]`);
  await expect(page.locator(`${day} .empty`)).toBeVisible();
  await page.click("#toast-act");
  await expect(page.locator(`${day} .set .num`)).toHaveText("100 lb × 10");
  expect(errors).toEqual([]);
});

test("while the keyboard is open, a bar keeps Next and Log set in reach", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, bench);
  await expect(page.locator("#kb-bar")).toBeHidden();
  // Pretend the on-screen keyboard took the bottom 340 px.
  await page.evaluate(() => { const vv = window.visualViewport, h = innerHeight - 340; Object.defineProperty(vv, "height", { get: () => h, configurable: true }); });
  await page.focus("#weight");
  await page.evaluate(() => window.visualViewport.dispatchEvent(new Event("resize")));
  await expect(page.locator("#kb-bar")).toBeVisible();
  await page.fill("#weight", "140");
  await expect(page.locator("#kb-log")).toHaveText("Log set · 140 × 10");
  await page.click("#kb-next");
  await expect(page.locator("#reps")).toBeFocused();
  await page.fill("#reps", "8");
  await page.click("#kb-log");
  await expect(page.locator(`${day} .set .num`)).toHaveText("140 lb × 8");
  await expect(page.locator("#kb-bar")).toBeHidden();
  expect(errors).toEqual([]);
});

test("Next on the keyboard moves from weight to reps", async ({ page }) => {
  const errors = await openApp(page);
  await expect(page.locator("#weight")).toHaveAttribute("enterkeyhint", "next");
  await page.focus("#weight");
  await page.keyboard.press("Enter");
  await expect(page.locator("#reps")).toBeFocused();
  expect(errors).toEqual([]);
});
