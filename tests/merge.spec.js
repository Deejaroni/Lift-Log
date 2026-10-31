const { test, expect } = require("@playwright/test");
const { set, openApp } = require("./helpers");

const stored = page => page.evaluate(() => ({
  e: JSON.parse(localStorage.getItem("liftlog.entries.v1")),
  st: JSON.parse(localStorage.getItem("liftlog.settings.v1") || "{}"),
}));
const openInfo = async (page, name) => {
  await page.click('nav.tabs [data-tab="history"]');
  await page.locator(`#history [data-exinfo="${name}"]`).first().click();
};

test("a misspelled exercise is offered and merged into the matching one", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ date: "2026-03-01", exercise: "Pec dec", muscle: "Chest", weight: 80, reps: 12 }),
    set({ date: "2026-03-01", exercise: "Pec dec", muscle: "Chest", weight: 80, reps: 12 }),
    set({ date: "2026-03-02", exercise: "Pec deck", muscle: "Chest", weight: 90, reps: 12 }),
  ] });
  await openInfo(page, "Pec dec");
  await expect(page.locator("#exs-name")).toHaveValue("Pec dec");
  await page.locator('#exs-same [data-same="Pec deck"]').click();
  await expect(page.locator("#exs-name")).toHaveValue("Pec deck");
  await page.click("#exs-save");
  await expect(page.locator("#dlg-msg")).toHaveText("Merge Pec dec into Pec deck? Its 2 sets will be listed as Pec deck.");
  await page.click("#dlg-ok");
  const s = await stored(page);
  expect(s.e.map(e => e.exercise)).toEqual(["Pec deck", "Pec deck", "Pec deck"]);
  const options = await page.locator("#hist-filter option").allTextContents();
  expect(options.filter(o => /pec/i.test(o))).toEqual(["Pec deck"]);
  expect(errors).toEqual([]);
});

test("renaming updates every set, the plan and the muscle settings", async ({ page }) => {
  const program = { name: "My plan", template: "", mode: "fixed", days: [null, null, "w1", null, null, null, null], rotation: [], workouts: [{ id: "w1", name: "Pull", items: [{ exercise: "My row", sets: 3, lo: 8, hi: 12 }] }],
    prog: { on: true, upper: 5, lower: 10, unit: "lb" }, deloadEvery: 0, start: "2026-03-02", done: {}, override: null };
  const errors = await openApp(page, {
    entries: [set({ date: "2026-03-01", exercise: "My row", muscle: "Back", weight: 100, reps: 10 })],
    settings: { bw: null, bwUnit: "lb", days: {}, bwLog: {}, program, exercises: { "my row": { muscle: "Back", also: ["Biceps"] } } },
  });
  await openInfo(page, "My row");
  await page.fill("#exs-name", "Landmine row");
  await page.click("#exs-save");
  await expect(page.locator("#dlg")).toBeHidden();
  const s = await stored(page);
  expect(s.e[0].exercise).toBe("Landmine row");
  expect(s.st.program.workouts[0].items[0].exercise).toBe("Landmine row");
  expect(s.st.exercises["landmine row"]).toEqual({ muscle: "Back", also: ["Biceps"] });
  expect(s.st.exercises["my row"]).toBeUndefined();
  await expect(page.locator('#history [data-exinfo="Landmine row"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("cancelling the merge question changes nothing", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ date: "2026-03-01", exercise: "Pec dec", muscle: "Chest", weight: 80, reps: 12 }),
    set({ date: "2026-03-02", exercise: "Pec deck", muscle: "Chest", weight: 90, reps: 12 }),
  ] });
  await openInfo(page, "Pec dec");
  await page.fill("#exs-name", "pec deck");
  await page.click("#exs-save");
  await page.click("#dlg-cancel");
  expect((await stored(page)).e.map(e => e.exercise)).toEqual(["Pec dec", "Pec deck"]);
  expect(errors).toEqual([]);
});

test("cardio can be renamed too, without muscle groups", async ({ page }) => {
  const errors = await openApp(page, { entries: [{ id: "c1", kind: "cardio", date: "2026-03-01", exercise: "Tredmill", muscle: "Cardio", minutes: 20, effort: "moderate", unit: "lb", weight: 0, reps: 0, sets: 1, note: "", ts: 1 }] });
  await openInfo(page, "Tredmill");
  await expect(page.locator("#exs-muscles")).toBeHidden();
  await page.locator('#exs-same [data-same="Treadmill"]').click();
  await page.click("#exs-save");
  await page.click("#dlg-ok");
  expect((await stored(page)).e[0].exercise).toBe("Treadmill");
  expect(errors).toEqual([]);
});
