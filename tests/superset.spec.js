const { test, expect } = require("@playwright/test");
const { set, openApp, pickExercise } = require("./helpers");

const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1")));
const resting = page => expect(page.locator(".actions")).toHaveClass(/resting/);
const notResting = page => expect(page.locator(".actions")).not.toHaveClass(/resting/);

async function logSet(page, name, superset) {
  await pickExercise(page, name);
  if (superset) await page.click("#ss-row .tog");
  await page.click("#save");
}

test("with Superset on, rest waits until the next exercise is logged", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Barbell bench press — flat");
  const box = await page.locator("#ss-row .tog").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.click("#ss-row .tog");
  await expect(page.locator("#ss-hint")).toHaveText("Rest waits until you log the next exercise.");
  await page.click("#save");
  await notResting(page);
  // The form resets with the switch off, and says what comes next.
  await expect(page.locator("#ss-on")).not.toBeChecked();
  await expect(page.locator("#ss-hint")).toHaveText("Superset with Barbell bench press — flat: rest starts after the next set you log.");
  await logSet(page, "Pec deck");
  await resting(page);
  const all = await saved(page);
  expect(all[0].ss).toBeTruthy();
  expect(all[0].ssLead).toBe(true);
  expect(all[1].ss).toBe(all[0].ss);
  expect(all[1].ssLead).toBeUndefined();
  expect(errors).toEqual([]);
});

test("picking the first exercise again turns the switch back on for the next round", async ({ page }) => {
  const errors = await openApp(page);
  await logSet(page, "Barbell bench press — flat", true);
  await logSet(page, "Pec deck");
  await pickExercise(page, "Barbell bench press — flat");
  await expect(page.locator("#ss-on")).toBeChecked();
  await page.click("#save");
  await notResting(page);
  await pickExercise(page, "Pec deck");
  await expect(page.locator("#ss-on")).not.toBeChecked();
  await page.click("#save");
  await resting(page);
  const all = await saved(page);
  expect(new Set(all.map(e => e.ss)).size).toBe(2);
  expect(errors).toEqual([]);
});

test("History and the day list label the pair", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    set({ exercise: "Barbell bench press — flat", muscle: "Chest", weight: 135, reps: 10, ss: "s1", ssLead: true }),
    set({ exercise: "Pec deck", muscle: "Chest", weight: 90, reps: 12, ss: "s1" }),
    set({ exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 }),
  ] });
  const tags = page.locator("#day-list .ss-tag");
  await expect(tags).toHaveText(["Superset with Pec deck", "Superset with Barbell bench press — flat"]);
  await page.click('nav.tabs [data-tab="history"]');
  await expect(page.locator("#history .ss-tag")).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("superset links survive CSV export and import", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "canShare", { value: undefined }));
  const errors = await openApp(page, { entries: [
    set({ id: "a", exercise: "Barbell bench press — flat", muscle: "Chest", weight: 135, reps: 10, ss: "s1", ssLead: true }),
    set({ id: "b", exercise: "Pec deck", muscle: "Chest", weight: 90, reps: 12, ss: "s1" }),
  ] });
  await page.click("#open-settings");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#export")]);
  const csv = require("fs").readFileSync(await dl.path(), "utf8").replace(/^a,/m, "a2,").replace(/^b,/m, "b2,");
  await page.setInputFiles("#import-file", { name: "sets.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(page.locator("#dlg-msg")).toContainText("Imported 2");
  const all = await saved(page);
  expect(all.find(e => e.id === "a2")).toMatchObject({ ss: "s1", ssLead: true });
  expect(all.find(e => e.id === "b2").ss).toBe("s1");
  expect(errors).toEqual([]);
});
