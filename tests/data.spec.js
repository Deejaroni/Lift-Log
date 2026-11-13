const { test, expect } = require("@playwright/test");
const { TODAY, set, cardio, openApp } = require("./helpers");

const day = "#day-list";
const program = { name: "My plan", template: "", mode: "fixed", days: [null, null, "w1", null, null, null, null], rotation: [], workouts: [{ id: "w1", name: "Push", items: [{ exercise: "Pec deck", sets: 3, reps: 10 }] }],
  prog: { on: true, upper: 5, lower: 10, unit: "lb" }, deloadEvery: 0, start: "2026-03-02", done: {}, override: null };

// Use a download instead of the phone's share sheet.
const noShare = page => page.addInitScript(() => Object.defineProperty(Navigator.prototype, "canShare", { value: undefined }));

test("Back up everything saves sets, plan, body weight and settings in one file", async ({ page }) => {
  await noShare(page);
  const errors = await openApp(page, {
    entries: [set({ id: "e1", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 })],
    settings: { bw: 180, bwUnit: "lb", days: {}, bwLog: { [TODAY]: { w: 180, unit: "lb" } }, program },
  });
  await page.click("#open-settings");
  await expect(page.locator("#backup-info")).toContainText("Not backed up yet");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#backup")]);
  expect(dl.suggestedFilename()).toBe(`lift-log-backup-${TODAY}.json`);
  const data = JSON.parse(require("fs").readFileSync(await dl.path(), "utf8"));
  expect(data.app).toBe("Lift Log");
  expect(data.entries.map(e => e.id)).toEqual(["e1"]);
  expect(data.settings.program.name).toBe("My plan");
  expect(data.settings.bwLog[TODAY].w).toBe(180);
  expect(data.prefs.unit).toBe("lb");
  await expect(page.locator("#backup-info")).toContainText("Last backup: today");
  expect(errors).toEqual([]);
});

test("restoring a backup adds missing sets once and can bring back the plan", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "e1", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 })] });
  const backup = {
    app: "Lift Log", backup: 1, exported: `${TODAY}T10:00:00Z`,
    entries: [set({ id: "e1", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 }), set({ id: "e2", exercise: "Pec deck", muscle: "Chest", weight: 90, reps: 12 })],
    settings: { bw: 175, bwUnit: "lb", days: {}, bwLog: { "2026-03-01": { w: 175, unit: "lb" } }, program },
    prefs: { unit: "lb" },
  };
  await page.click("#open-settings");
  await page.setInputFiles("#import-file", { name: "lift-log-backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.locator("#dlg-msg")).toContainText("plan");
  await page.click("#dlg-ok");
  await expect(page.locator("#dlg-msg")).toContainText("Restored 1 entry");
  await page.click("#dlg-ok");
  await page.waitForLoadState("load");
  const saved = await page.evaluate(() => ({ e: JSON.parse(localStorage.getItem("liftlog.entries.v1")), s: JSON.parse(localStorage.getItem("liftlog.settings.v1")) }));
  expect(saved.e.map(e => e.id).sort()).toEqual(["e1", "e2"]);
  expect(saved.s.program.name).toBe("My plan");
  expect(saved.s.bwLog["2026-03-01"].w).toBe(175);
  expect(errors).toEqual([]);
});

test("old saved data without a backup date gets a gentle reminder that can be put off", async ({ page }) => {
  // Prefs from before backups were tracked: no lastBackup field.
  const errors = await openApp(page, { entries: [set({ date: "2026-02-20", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 })], prefs: { unit: "lb" } });
  const nudge = page.locator("#backup-nudge");
  await expect(nudge).toBeVisible();
  await expect(nudge).toContainText("You haven't backed up yet");
  await nudge.locator("[data-later]").click();
  await expect(nudge).toBeHidden();
  await page.reload();
  await expect(nudge).toBeHidden();
  expect(errors).toEqual([]);
});

test("the reminder shows when the last backup is two weeks old, not before", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ date: "2026-01-10", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 })], prefs: { unit: "lb", lastBackup: "2026-02-12" } });
  await expect(page.locator("#backup-nudge")).toContainText("20 days ago");
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("liftlog.prefs.v1")); p.lastBackup = "2026-02-25"; localStorage.setItem("liftlog.prefs.v1", JSON.stringify(p)); });
  await page.reload();
  await expect(page.locator("#backup-nudge")).toBeHidden();
  expect(errors).toEqual([]);
});

test("deleting a set is instant and can be undone", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "e1", exercise: "Seated cable row", muscle: "Back", weight: 100, reps: 10 })] });
  await page.click(`${day} [data-tap="e1"]`);
  await page.click(`${day} [data-del="e1"]`);
  await expect(page.locator("#dlg")).toBeHidden();
  await expect(page.locator(`${day} .empty`)).toBeVisible();
  await expect(page.locator("#toast")).toContainText("Set deleted");
  const box = await page.locator("#toast-act").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.click("#toast-act");
  await expect(page.locator(`${day} .set .num`)).toHaveText("100 lb × 10");
  await expect(page.locator("#toast")).toBeHidden();
  expect(errors).toEqual([]);
});

test("undo brings back a whole drop set", async ({ page }) => {
  const chain = [300, 250, 200].map((w, i) => set({ id: `d${i}`, exercise: "Leg press", muscle: "Quadriceps", weight: w, reps: 10, chain: "c1", step: i }));
  const errors = await openApp(page, { entries: chain });
  await page.click(`${day} [data-tap="c1"]`);
  await page.click(`${day} [data-del-chain="c1"]`);
  await expect(page.locator(`${day} .chain`)).toHaveCount(0);
  await expect(page.locator("#toast")).toContainText("Drop set deleted");
  await page.click("#toast-act");
  await expect(page.locator(`${day} .chain-steps`)).toHaveText("300×10→250×10→200×10");
  expect(errors).toEqual([]);
});

test("a CSV export imports back with the same sets", async ({ page }) => {
  const entries = [
    set({ exercise: "Bench press", muscle: "Chest", weight: 185, reps: 5, rir: 2, equip: { bb: { bar: 45 } }, variant: { equip: "Barbell", angle: "Flat" } }),
    set({ exercise: "Dumbbell row", muscle: "Back", weight: 60, reps: 10, failure: true, note: "slow, \"strict\"" }),
    cardio({ exercise: "Treadmill", minutes: 25, distance: 2, distUnit: "mi" }),
  ];
  const errors = await openApp(page, { entries });
  const csv = await page.evaluate(async () => (await import("/js/backup.js")).toCSV());
  await page.evaluate(() => localStorage.setItem("liftlog.entries.v1", "[]"));
  await page.reload();
  await page.setInputFiles("#import-file", { name: "lift-log.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1")).length)).toBe(3);
  const back = await page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1")));
  const pick = e => ({ id: e.id, exercise: e.exercise, weight: e.weight, reps: e.reps, kind: e.kind || "", minutes: e.minutes || 0, failure: !!e.failure, note: e.note, rir: e.rir ?? null, equip: e.equip || null, variant: e.variant || null });
  expect(back.map(pick)).toEqual(entries.map(pick));
  expect(errors).toEqual([]);
});

test("a failed save of settings or preferences says so", async ({ page }) => {
  const errors = await openApp(page);
  await page.evaluate(() => { const real = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (/settings|prefs/.test(k)) throw new DOMException("full", "QuotaExceededError"); return real.call(this, k, v); }; });
  await page.evaluate(async () => { (await import("/js/state.js")).savePrefs(); });
  await expect(page.locator("#msg")).toHaveText("Couldn't save on this device.");
  await page.evaluate(() => { document.querySelector("#msg").textContent = ""; });
  await page.evaluate(async () => { await (await import("/js/state.js")).saveSettings(); });
  await expect(page.locator("#msg")).toHaveText("Couldn't save on this device.");
  expect(errors).toEqual([]);
});
