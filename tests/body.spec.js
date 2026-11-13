// Phase 6: the Body section on Progress (weight trend, measurements, photos), lift goals and the photo backup.
const { test, expect } = require("@playwright/test");
const { TODAY, set, openApp } = require("./helpers");

const stored = page => page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.settings.v1") || "{}"));
const openProgress = page => page.click('nav.tabs [data-tab="progress"]');
// Weigh-ins every few days for the four weeks before TODAY, going down about 1 lb a week.
const weighIns = () => {
  const log = {};
  for (let i = 28; i >= 0; i -= 2) { const d = new Date(`${TODAY}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - i); log[d.toISOString().slice(0, 10)] = { w: 180 + i / 7 + (i % 4 ? .4 : -.4), unit: "lb" }; }
  return log;
};
// Settings saved before phase 6: no measurements and no goals.
const oldSettings = () => ({ bw: 180, bwUnit: "lb", days: {}, bwLog: weighIns(), favs: [], exercises: {} });
// A small picture, made in the page, as a file for the photo picker.
const pngFile = async (page, color) => ({ name: "me.png", mimeType: "image/png", buffer: Buffer.from(await page.evaluate(c => {
  const cv = document.createElement("canvas"); cv.width = 60; cv.height = 80; const x = cv.getContext("2d"); x.fillStyle = c; x.fillRect(0, 0, 60, 80);
  return cv.toDataURL("image/png").split(",")[1];
}, color), "base64") });

test("older settings load, and the Body section shows the weigh-ins with a trend and a weekly rate", async ({ page }) => {
  const errors = await openApp(page, { settings: oldSettings() });
  await openProgress(page);
  const body = page.locator("#body");
  await expect(body.locator("h2")).toHaveText("Body");
  await expect(body.locator('[data-bview="weight"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#body-now")).toContainText("179.6");   // the latest weigh-in
  await expect(page.locator("#body-rate")).toHaveText(/^Down 1(\.\d)? lb a week$/);
  await expect(page.locator("#body-chart")).toBeVisible();
  const s = await page.evaluate(async () => { const { settings } = await import("/js/state.js"); return { meas: settings.meas, goals: settings.goals }; });
  expect(s.meas).toEqual({}); expect(s.goals).toEqual({});   // the new parts start empty
  expect(errors).toEqual([]);
});

test("Add weigh-in records today's body weight", async ({ page }) => {
  const errors = await openApp(page);
  await openProgress(page);
  await expect(page.locator("#body-now")).toHaveText("No weigh-ins yet");
  await page.click("#bw-add");
  await page.fill("#dlg-input", "182.4");
  await page.click("#dlg-ok");
  await expect(page.locator("#body-now")).toContainText("182.4");
  expect((await stored(page)).bwLog[TODAY]).toEqual({ w: 182.4, unit: "lb" });
  expect(errors).toEqual([]);
});

test("measurements: blanks are skipped, each row shows its change, and a row shows its own chart", async ({ page }) => {
  const settings = { ...oldSettings(), meas: { "2026-02-01": { waist: 34.5, chest: 41, fat: 18.2, unit: "in" } }, goals: {} };
  const errors = await openApp(page, { settings });
  await openProgress(page);
  await page.click('[data-bview="meas"]');
  await page.click("#meas-add");
  await expect(page.locator("#meas-sheet")).toBeVisible();
  await expect(page.locator("#m-waist")).toHaveAttribute("placeholder", "34.5");   // last time's number as a hint
  await page.fill("#m-waist", "33.5"); await page.fill("#m-fat", "16.8");
  await page.click("#meas-save");
  await expect(page.locator("#meas-sheet")).toBeHidden();
  expect((await stored(page)).meas[TODAY]).toEqual({ waist: 33.5, fat: 16.8, unit: "in" });
  const waist = page.locator('.bd-row[data-meas="waist"]');
  await expect(waist).toContainText("33.5 in");
  await expect(waist).toContainText("−1");
  await expect(page.locator('.bd-row[data-meas="fat"]')).toContainText("16.8 %");
  await expect(page.locator('.bd-row[data-meas="hips"]')).toHaveCount(0);   // never measured
  await page.click('.bd-row[data-meas="fat"]');
  await expect(page.locator('.bd-row[data-meas="fat"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#body-chart")).toBeVisible();
  expect(errors).toEqual([]);
});

test("a lift goal shows on the progress card with a bar and a projection, and reaching it shows a badge", async ({ page }) => {
  const days = ["2026-02-04", "2026-02-11", "2026-02-18", "2026-02-25"];
  const errors = await openApp(page, { entries: days.map((date, i) => set({ date, exercise: "Bench press", muscle: "Chest", weight: 165 + i * 5, reps: 5, variant: { equip: "Barbell" } })) });
  await openProgress(page);
  await page.selectOption("#prog-ex", "Bench press");
  await page.click("#goal-set");
  await expect(page.locator("#goal-sheet")).toBeVisible();
  await page.fill("#g-weight", "225"); await page.fill("#g-reps", "1"); await page.fill("#g-by", "2026-06-01");
  await expect(page.locator("#g-hint")).toContainText("above your best est. 1RM now");
  await page.click("#goal-save");
  const goal = page.locator("#prog-goal");
  await expect(goal).toContainText("Goal: 225 lb × 1");
  await expect(goal).toContainText("by Mon, Jun 1");
  await expect(goal).toContainText("Best est. 1RM 210 lb of 225");
  expect((await stored(page)).goals["bench press"]).toMatchObject({ exercise: "Bench press", weight: 225, reps: 1, unit: "lb", by: "2026-06-01", set: TODAY });
  // Hitting it today.
  await page.evaluate(async () => { const { store } = await import("/js/state.js"); await store.add([{ id: "g1", date: "2026-03-04", exercise: "Bench press", muscle: "Chest", weight: 225, reps: 1, unit: "lb", sets: 1, note: "", ts: 99, variant: { equip: "Barbell" } }]); });
  await expect(goal).toContainText("Reached");
  await page.click('nav.tabs [data-tab="history"]');
  await expect(page.locator("#day-2026-03-04 .pr").filter({ hasText: "Goal" })).toBeVisible();
  // Remove it.
  await openProgress(page);
  await page.click("#goal-edit");
  await page.click("#goal-remove");
  await page.click("#dlg-ok");
  await expect(page.locator("#goal-set")).toBeVisible();
  expect((await stored(page)).goals).toEqual({});
  expect(errors).toEqual([]);
});

test("photos stay on the phone, can be compared side by side, and have their own backup", async ({ page }) => {
  const errors = await openApp(page, { settings: oldSettings() });
  await openProgress(page);
  await page.click('[data-bview="photos"]');
  await expect(page.locator("#body .bd-photos")).toContainText("No photos yet");
  await page.setInputFiles("#photo-file", await pngFile(page, "#c33"));
  await expect(page.locator("#body .bd-ph")).toHaveCount(1);
  // Another one dated earlier, straight into storage.
  await page.evaluate(async () => { const p = await import("/js/photos.js"); const b = await (await fetch(document.querySelector("#body .bd-ph img").src)).blob(); await p.addPhoto(b, "2026-02-01"); });
  await page.reload();
  await openProgress(page);
  await page.click('[data-bview="photos"]');
  await expect(page.locator("#body .bd-ph")).toHaveCount(2);
  await expect(page.locator("#body .bd-ph").first()).toContainText("Mar 4");
  await page.click("#photo-compare");
  await page.locator("#body .bd-ph").nth(0).click(); await page.locator("#body .bd-ph").nth(1).click();
  const cmp = page.locator("#cmp-sheet");
  await expect(cmp).toBeVisible();
  await expect(cmp).toContainText("lb");   // the weigh-in from each day
  await expect(cmp).toContainText("4 weeks apart");
  await page.click("#cmp-close");
  // Photo backup: its own file, and restoring it brings back what's missing.
  await expect(page.locator("#photo-info")).toContainText("2 photos");
  const json = await page.evaluate(async () => (await import("/js/photos.js")).photoBackupText());
  expect(JSON.parse(json)).toMatchObject({ app: "Lift Log", photos: 1 });
  await page.evaluate(async () => { const p = await import("/js/photos.js"); for (const x of await p.listPhotos()) await p.deletePhoto(x.id); });
  await page.evaluate(t => { import("/js/backup.js").then(m => m.restoreBackup(t)); }, json);   // it waits for OK
  await expect(page.locator("#dlg-msg")).toHaveText("Restored 2 photos.");
  await page.click("#dlg-ok");
  expect(await page.evaluate(async () => (await (await import("/js/photos.js")).listPhotos()).length)).toBe(2);
  expect(errors).toEqual([]);
});

test("a photo can be opened and deleted", async ({ page }) => {
  const errors = await openApp(page);
  await openProgress(page);
  await page.click('[data-bview="photos"]');
  await page.setInputFiles("#photo-file", await pngFile(page, "#36c"));
  await page.locator("#body .bd-ph").first().click();
  await expect(page.locator("#photo-sheet img")).toBeVisible();
  await page.click("#photo-del");
  await page.click("#dlg-ok");
  await expect(page.locator("#body .bd-ph")).toHaveCount(0);
  expect(errors).toEqual([]);
});
