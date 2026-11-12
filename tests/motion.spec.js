const { test, expect } = require("@playwright/test");
const { set, openApp, pickExercise } = require("./helpers");

const bench = "Barbell bench press — flat";
const day = "#day-list";
const anim = (page, sel) => page.locator(sel).first().evaluate(el => getComputedStyle(el).animationName);

test("logging a set confirms on the button and slides the new set in", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ id: "a", exercise: bench, muscle: "Chest", weight: 135, reps: 8, ts: 1 }), set({ id: "b", exercise: bench, muscle: "Chest", weight: 135, reps: 8, ts: 2 })] });
  await expect(page.locator(`${day} .set.new`)).toHaveCount(0);   // nothing is new when the app opens
  await pickExercise(page, bench);
  await page.click("#save");
  await expect(page.locator(".actions")).toHaveClass(/logged/);
  await expect(page.locator("#save-ok")).toHaveText("✓ Logged");
  await expect(page.locator(`${day} .set[data-tap]`)).toHaveCount(3);
  await expect(page.locator(`${day} .set.new`)).toHaveCount(1);
  await expect(page.locator(`${day} .set[data-tap="a"]`)).not.toHaveClass(/new/);
  expect(await anim(page, `${day} .set.new`)).toBe("slide-in");
  // The total counts up to the new value.
  await expect(page.locator(`${day} .ex-head .vol`)).toHaveText("3 sets · 3,240 lb");
  await expect(page.locator(".actions")).not.toHaveClass(/logged/, { timeout: 2000 });
  // A later redraw (another day and back) doesn't replay it.
  await page.click("#ctx-line");
  await page.fill("#date", "2026-03-03"); await page.fill("#date", "2026-03-04");
  await expect(page.locator(`${day} .set.new`)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a badge earned by the set just logged pops in, once", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ date: "2026-02-25", exercise: bench, muscle: "Chest", weight: 135, reps: 8 })] });
  await pickExercise(page, bench);
  await page.fill("#weight", "155"); await page.fill("#reps", "5");
  await page.click("#save");
  const badge = page.locator(`${day} .ex-head .pr`).first();
  await expect(badge).toHaveClass(/pop/);
  expect(await anim(page, `${day} .ex-head .pr.pop`)).toBe("pop");
  await page.reload();
  await expect(page.locator(`${day} .ex-head .pr`).first()).not.toHaveClass(/pop/);
  expect(errors).toEqual([]);
});

test("switching tabs glides the red pill and fades the page in", async ({ page }) => {
  const errors = await openApp(page);
  await page.click('nav.tabs [data-tab="plan"]');
  expect(await anim(page, "#tab-plan")).toBe("tab-in");
  await expect(page.locator("nav.tabs .tab-glide")).toBeHidden({ timeout: 2000 });
  // At rest the active tab is red as before.
  const bg = await page.locator('nav.tabs [aria-selected="true"]').evaluate(el => getComputedStyle(el).backgroundColor);
  const red = await page.evaluate(() => { const i = document.createElement("i"); i.style.color = "var(--red)"; document.body.append(i); return getComputedStyle(i).color; });
  expect(bg).toBe(red);
  expect(errors).toEqual([]);
});

test("sheets and dialogs slide up; cards open smoothly", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, bench);
  await page.click("#ex-chosen-text");
  expect(await anim(page, "#exsheet")).toBe("fade-in");
  expect(await anim(page, "#exsheet .dlg")).toBe("sheet-up");
  await page.click("#exs-close");
  await page.click("#open-settings");
  expect(await anim(page, "#settings")).toBe("sheet-up");
  await page.click("#settings-done");
  await page.click("#equip-sum");
  expect(await anim(page, "#equip-body")).toBe("reveal");
  await page.click("#note-toggle");
  expect(await anim(page, "#note-wrap")).toBe("reveal");
  expect(errors).toEqual([]);
});

test("with reduce motion on, nothing moves", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await openApp(page, { entries: [set({ exercise: bench, muscle: "Chest", weight: 135, reps: 8 })] });
  await pickExercise(page, bench);
  await page.click("#save");
  await expect(page.locator(`${day} .set[data-tap]`)).toHaveCount(2);
  await expect(page.locator(`${day} .ex-head .vol`)).toHaveText("2 sets · 2,160 lb");
  expect(await anim(page, `${day} .set[data-tap]:last-of-type`)).toBe("none");
  await page.click('nav.tabs [data-tab="plan"]');
  expect(await anim(page, "#tab-plan")).toBe("none");
  await expect(page.locator("nav.tabs .tab-glide")).toBeHidden();
  expect(errors).toEqual([]);
});

test("when rest ends the button pulses green and the Log tab flashes", async ({ page }) => {
  const errors = await openApp(page);
  // The tests fix the clock, so end the rest the way the timer does when it reaches zero.
  await page.evaluate(async () => { const m = await import("/js/main.js"); m.startRest(60); m.finishRest(); });
  await expect(page.locator(".actions")).toHaveClass(/over/, { timeout: 3000 });
  expect(await anim(page, ".actions.over .save-rest")).toBe("rest-pulse");
  await expect(page.locator('nav.tabs [data-tab="log"]')).toHaveClass(/ping/);
  expect(errors).toEqual([]);
});

test("the rest chime can be turned off in Settings", async ({ page }) => {
  const errors = await openApp(page);
  expect(await page.evaluate(async () => (await import("/js/main.js")).chimeOn())).toBe(true);   // on, as before
  await page.click("#open-settings");
  const sw = page.locator("#rest-chime");
  await expect(sw).toBeChecked();
  await page.locator("label.tog", { has: sw }).click();
  await expect(sw).not.toBeChecked();
  expect(await page.evaluate(async () => (await import("/js/main.js")).chimeOn())).toBe(false);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("liftlog.prefs.v1")).chime)).toBe(false);
  await expect(page.locator("#rest-alert-note")).not.toContainText("chimes");
  expect(errors).toEqual([]);
});
