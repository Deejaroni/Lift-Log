// Parent exercises with variants: one "Lat pulldown" with equipment, attachment, grip and position details,
// instead of a separate exercise for every version.
const { test, expect } = require("@playwright/test");
const { openApp, set, TODAY } = require("./helpers");

const stored = page => page.evaluate(() => ({
  entries: JSON.parse(localStorage.getItem("liftlog.entries.v1") || "[]"),
  settings: JSON.parse(localStorage.getItem("liftlog.settings.v1") || "{}"),
}));

test("the library groups versions of a movement under one parent, each with its details", async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(async () => {
    const { PARENTS, LIB, variantLabel } = await import("/js/parents.js");
    const lp = PARENTS.get("Lat pulldown");
    return { count: lp.variants.length, wide: LIB.get("lat pulldown — wide overhand"), machine: variantLabel(LIB.get("iso-lateral pulldown").v),
      rdl: LIB.get("romanian deadlift").parent, bench: variantLabel(LIB.get("dumbbell bench press — low incline").v), dims: Object.keys(lp.dims) };
  });
  expect(r.count).toBeGreaterThanOrEqual(12);
  expect(r.wide.parent).toBe("Lat pulldown");
  expect(r.wide.v).toMatchObject({ equip: "Cable", attach: "Lat pulldown bar", width: "Wide", grip: "Overhand" });
  expect(r.machine).toBe("Machine · Independent arms");
  expect(r.rdl).toBe("Deadlift");
  expect(r.bench).toBe("Dumbbell · Low incline");
  expect(r.dims).toEqual(expect.arrayContaining(["equip", "attach", "width", "grip", "pos", "side"]));
  expect(errors).toEqual([]);
});

test("search shows one row per parent, with how many variants it has", async ({ page }) => {
  const errors = await openApp(page);
  await page.fill("#exercise-search", "pulldown");
  const rows = page.locator('#ex-results .ex-opt[data-name="Lat pulldown"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("variants");
  await expect(page.locator('#ex-results [data-name="Lat pulldown — wide overhand"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("choosing a parent fills in the last variant as chips, and a changed chip is saved with the set", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ date: "2026-03-01", exercise: "Lat pulldown", muscle: "Back", weight: 140, reps: 10,
    variant: { equip: "Cable", attach: "Lat pulldown bar", width: "Wide", grip: "Overhand", pos: "Seated" } })] });
  await page.fill("#exercise-search", "lat pulldown");
  await page.click('#ex-results [data-name="Lat pulldown"]');
  await expect(page.locator("#ex-chosen-name")).toHaveText("Lat pulldown");
  const chips = page.locator("#ex-variant .vchip");
  await expect(chips.filter({ hasText: "Wide" })).toHaveCount(1);
  await expect(chips.filter({ hasText: "Lat bar" })).toHaveCount(1);
  // Change the grip to underhand.
  await chips.filter({ hasText: "Overhand" }).click();
  await expect(page.locator("#ex-vedit")).toBeVisible();
  await page.click('#ex-vedit [data-dim="grip"][data-val="Underhand"]');
  await page.click("#ex-vedit-done");
  await expect(page.locator("#ex-vedit")).toBeHidden();
  await expect(chips.filter({ hasText: "Underhand" })).toHaveCount(1);
  await page.fill("#weight", "120"); await page.fill("#reps", "8");
  await page.click("#save");
  const { entries } = await stored(page);
  const last = entries.find(e => e.date === TODAY);
  expect(last.exercise).toBe("Lat pulldown");
  expect(last.variant).toMatchObject({ equip: "Cable", width: "Wide", grip: "Underhand" });
  expect(errors).toEqual([]);
});

test("searching for a specific version picks that variant", async ({ page }) => {
  const errors = await openApp(page);
  await page.fill("#exercise-search", "neutral grip pulldown");
  await page.click('#ex-results [data-name="Lat pulldown"]');
  await expect(page.locator("#ex-variant .vchip").filter({ hasText: "Neutral" }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("old sets, favorites and plan items move to the parent with their variant", async ({ page }) => {
  const errors = await openApp(page, {
    entries: [
      set({ date: "2026-03-01", exercise: "Lat pulldown — wide overhand", muscle: "Back", weight: 140, reps: 10, equip: { cable: { attach: "Lat pulldown bar" } } }),
      set({ date: "2026-03-02", exercise: "Iso-lateral pulldown", muscle: "Back", weight: 90, reps: 8 }),
      set({ date: "2026-03-02", exercise: "Dumbbell lateral raise — standing", muscle: "Shoulders", weight: 20, reps: 12, variant: { grip: "Thumbs up", path: "Straight out to the sides" } }),
      set({ date: "2026-03-03", exercise: "My cable thing", muscle: "Back", weight: 50, reps: 10 }),
    ],
    settings: { bw: null, bwUnit: "lb", days: {}, bwLog: {}, favs: ["Romanian deadlift"], exercises: {},
      program: { name: "P", template: "x", mode: "fixed", days: [null, null, "w1", null, null, null, null], rotation: [], start: "2026-03-02", done: {}, override: null, deloadEvery: 0,
        prog: { on: false, upper: 5, lower: 10, unit: "lb" }, workouts: [{ id: "w1", name: "Pull", items: [{ exercise: "Lat pulldown — close overhand", sets: 3, lo: 8, hi: 12 }] }] } },
  });
  const { entries, settings } = await stored(page);
  const byDate = d => entries.filter(e => e.date === d);
  expect(byDate("2026-03-01")[0]).toMatchObject({ exercise: "Lat pulldown", weight: 140, variant: { equip: "Cable", width: "Wide", grip: "Overhand" } });
  expect(byDate("2026-03-01")[0].equip).toEqual({ cable: { attach: "Lat pulldown bar" } });   // the math-bearing equipment is untouched
  expect(byDate("2026-03-02").find(e => e.weight === 90)).toMatchObject({ exercise: "Lat pulldown", variant: { equip: "Machine", side: "Independent arms" } });
  const lr = byDate("2026-03-02").find(e => e.weight === 20);
  expect(lr.exercise).toBe("Lateral raise");
  expect(lr.variant).toMatchObject({ equip: "Dumbbell", pos: "Standing" });
  expect(lr.lr).toEqual({ grip: "Thumbs up", path: "Straight out to the sides" });   // the lateral-raise details keep their own place
  expect(byDate("2026-03-03")[0].exercise).toBe("My cable thing");   // your own exercises stay as they are
  expect(settings.favs).toEqual(["Deadlift"]);
  expect(settings.program.workouts[0].items[0]).toMatchObject({ exercise: "Lat pulldown", variant: { width: "Close", grip: "Overhand" } });
  // History shows one name with the variant under it.
  await page.click('[data-tab="history"]');
  await expect(page.locator("#history").getByText("Cable · Lat bar · Wide overhand")).toBeVisible();
  expect(errors).toEqual([]);
});

test("progress combines every variant, with a filter for one", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ date: "2026-02-20", exercise: "Lat pulldown", muscle: "Back", weight: 140, reps: 10, variant: { equip: "Cable", attach: "Lat pulldown bar", width: "Wide", grip: "Overhand" } }),
    set({ date: "2026-02-27", exercise: "Lat pulldown", muscle: "Back", weight: 160, reps: 8, variant: { equip: "Cable", attach: "Lat pulldown bar", width: "Wide", grip: "Overhand" } }),
    set({ date: "2026-03-01", exercise: "Lat pulldown", muscle: "Back", weight: 200, reps: 8, variant: { equip: "Plate-loaded" } }),
  ] });
  await page.click('[data-tab="progress"]');
  const filter = page.locator(".vfilter");
  await expect(filter.first()).toBeVisible();
  await expect(filter.getByRole("button", { name: "All variants" })).toHaveAttribute("aria-pressed", "true");
  await filter.getByRole("button", { name: /Cable/ }).click();
  await expect(filter.getByRole("button", { name: /Cable/ })).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
