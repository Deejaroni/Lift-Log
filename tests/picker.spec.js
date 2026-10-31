const { test, expect } = require("@playwright/test");
const { set, openApp } = require("./helpers");

const rows = "#ex-results [data-name]";
const names = page => page.locator(rows).evaluateAll(els => els.map(e => e.dataset.name));
const search = (page, q) => page.fill("#exercise-search", q);

test("search ignores hyphens, plurals and small typos", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "pushup");
  expect((await names(page))[0]).toBe("Push-up");
  await search(page, "bech pres");
  expect(await names(page)).toContain("Barbell bench press — flat");
  await search(page, "cable flys");
  expect((await names(page)).slice(0, 3).every(n => n.startsWith("Cable fly"))).toBe(true);
  await search(page, "tricep pushdown");
  expect((await names(page)).length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("search knows common short names", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "rdl");
  expect(await names(page)).toContain("Romanian deadlift");
  await search(page, "romanian");
  expect(await names(page)).toContain("Smith machine RDL");
  await search(page, "ohp");
  expect((await names(page)).some(n => /overhead press|shoulder press/i.test(n))).toBe(true);
  await search(page, "pec fly");
  expect(await names(page)).toContain("Pec deck");
  expect(errors).toEqual([]);
});

test("exact names come first and each name shows once", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "romanian deadlift");
  const list = await names(page);
  expect(list[0]).toBe("Romanian deadlift");
  expect(list.filter(n => n === "Romanian deadlift")).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("with a muscle group set, matches in other groups still show", async ({ page }) => {
  const errors = await openApp(page);
  await page.selectOption("#group-filter", "Chest");
  await search(page, "hip thrust");
  await expect(page.locator("#ex-results .ex-sec")).toContainText(["In other groups"]);
  await page.click(`${rows}[data-name="Barbell hip thrust"]`);
  await expect(page.locator("#ex-chosen-name")).toHaveText("Barbell hip thrust");
  await expect(page.locator("#ex-chosen-meta")).toContainText("Glutes");
  await page.click("#save");
  await page.click('nav.tabs [data-tab="history"]');
  await expect(page.locator("#history")).toContainText("Barbell hip thrust");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.entries.v1")));
  expect(saved[0].muscle).toBe("Glutes");
  expect(errors).toEqual([]);
});

test("tapping a result chooses it; Change goes back to the list", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ date: "2026-02-25", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 })] });
  // Recently used shows before typing anything.
  await expect(page.locator(`${rows}[data-name="Leg press"]`)).toBeVisible();
  const box = await page.locator(rows).first().boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  await page.click(`${rows}[data-name="Leg press"]`);
  await expect(page.locator("#ex-chosen-name")).toHaveText("Leg press");
  await expect(page.locator("#ex-results")).toBeHidden();
  await expect(page.locator("#w-last")).toHaveText("Last 300 × 10");
  await page.click("#ex-change");
  await expect(page.locator("#ex-results")).toBeVisible();
  await expect(page.locator("#exercise-search")).toBeFocused();
  expect(errors).toEqual([]);
});

test("Enter in the search box picks the top result", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "leg press");
  await page.press("#exercise-search", "Enter");
  await expect(page.locator("#ex-chosen-name")).toHaveText("Leg press");
  expect(errors).toEqual([]);
});

test("no match offers to add the search as a new exercise", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "qwxzv");
  await expect(page.locator(rows)).toHaveCount(0);
  await page.click("#ex-results [data-new]");
  await expect(page.locator("#new-ex-wrap")).toBeVisible();
  await expect(page.locator("#exercise")).toHaveValue("qwxzv");
  expect(errors).toEqual([]);
});

test("after logging, the picker resets to search", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "leg press");
  await page.click(`${rows}[data-name="Leg press"]`);
  await page.click("#save");
  await expect(page.locator("#ex-chosen")).toBeHidden();
  await expect(page.locator("#exercise-search")).toHaveValue("");
  await expect(page.locator(`${rows}[data-name="Leg press"]`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("starting a planned exercise fills the picker", async ({ page }) => {
  const errors = await openApp(page);
  await page.click('nav.tabs [data-tab="plan"]');
  await page.click('[data-tpl="ppl"]');
  await page.click('nav.tabs [data-tab="log"]');
  await page.click('#plan-today [data-plan-start="1"]');
  await expect(page.locator("#ex-chosen-name")).toHaveText("Romanian deadlift");
  await expect(page.locator("#ex-chosen-meta")).toContainText("Hamstrings");
  await expect(page.locator("#ex-find")).toBeHidden();
  expect(errors).toEqual([]);
});

test("misspelled words are corrected, with a note saying so", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "bnch press");
  await expect(page.locator("#ex-results .ex-fix")).toContainText("bench press");
  expect((await names(page)).slice(0, 5)).toContain("Barbell bench press — flat");
  await search(page, "squt");
  expect((await names(page))[0]).toMatch(/squat/i);
  await search(page, "dumbel row");
  expect((await names(page)).some(n => /dumbbell row/i.test(n))).toBe(true);
  await search(page, "dedlift");
  expect((await names(page))[0]).toMatch(/deadlift/i);
  // A correctly spelled search shows no note.
  await search(page, "bench press");
  await expect(page.locator("#ex-results .ex-fix")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a half-typed misspelled word still finds results", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "bnc");
  expect((await names(page)).some(n => /bench/i.test(n))).toBe(true);
  await search(page, "bnch pr");
  expect((await names(page)).slice(0, 5).some(n => /bench press/i.test(n))).toBe(true);
  expect(errors).toEqual([]);
});

test("tapping the correction fixes the search box", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "hammr curl");
  await page.click("#ex-results .ex-fix");
  await expect(page.locator("#exercise-search")).toHaveValue("hammer curl");
  await expect(page.locator("#ex-results .ex-fix")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("when nothing matches every word, the closest matches show", async ({ page }) => {
  const errors = await openApp(page);
  await search(page, "zercher carry");
  await expect(page.locator("#ex-results .ex-fix")).toHaveCount(0);
  await expect(page.locator("#ex-results .ex-sec").first()).toHaveText("No exact match. Closest matches:");
  expect(await names(page)).toContain("Farmer's carry");
  expect(errors).toEqual([]);
});
