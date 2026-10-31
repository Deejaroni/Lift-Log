const { test, expect } = require("@playwright/test");
const { set, openApp, pickExercise } = require("./helpers");

const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1")));

test("reps left in the tank is saved on every set logged and shown with RPE", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Leg press");
  await page.fill("#weight", "300");
  await page.fill("#sets", "2");
  const chip = page.locator('#rir-chips [data-rir="2"]');
  const box = await chip.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await page.click("#save");
  expect((await saved(page)).map(e => e.rir)).toEqual([2, 2]);
  await expect(page.locator("#day-list .set .note").first()).toContainText("2 left · RPE 8");
  // The form resets after logging.
  await expect(page.locator('#rir-chips [aria-pressed="true"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("tapping the same chip again clears it, and 4+ reads as RPE 6 or less", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Leg press");
  await page.click('#rir-chips [data-rir="1"]');
  await page.click('#rir-chips [data-rir="1"]');
  await expect(page.locator('#rir-chips [aria-pressed="true"]')).toHaveCount(0);
  await page.click('#rir-chips [data-rir="4"]');
  await page.click("#save");
  expect((await saved(page))[0].rir).toBe(4);
  await expect(page.locator("#day-list .set .note").first()).toContainText("4+ left · RPE 6 or less");
  expect(errors).toEqual([]);
});

test("sets logged without it, including older saved sets, show nothing extra", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "old", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 })] });
  await pickExercise(page, "Leg press");
  await page.click("#save");
  const all = await saved(page);
  expect(all.every(e => !("rir" in e))).toBe(true);
  await expect(page.locator("#day-list")).not.toContainText("RPE");
  expect(errors).toEqual([]);
});

test("CSV export and import keep reps left in the tank", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "canShare", { value: undefined }));
  const errors = await openApp(page, { entries: [set({ id: "r1", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10, rir: 3 })] });
  await page.click("#open-settings");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#export")]);
  const csv = require("fs").readFileSync(await dl.path(), "utf8").split("\n");
  const head = csv[0].split(","), row = csv[1].split(",");
  expect(row[head.indexOf("rir")]).toBe("3");
  const imported = csv[0] + "\n" + csv[1].replace("r1", "r2");
  await page.setInputFiles("#import-file", { name: "sets.csv", mimeType: "text/csv", buffer: Buffer.from(imported) });
  await expect(page.locator("#dlg-msg")).toContainText("Imported 1");
  expect((await saved(page)).find(e => e.id === "r2").rir).toBe(3);
  expect(errors).toEqual([]);
});
