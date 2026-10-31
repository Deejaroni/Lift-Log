const { test, expect } = require("@playwright/test");
const { openApp, pickExercise, set } = require("./helpers");

// Runs in the page, against the app's own modules.
const library = () => import("/js/exercise-library.js").then(({ CATALOG_TEXT }) => {
  const rows = []; let m = null, sub = null;
  CATALOG_TEXT.split("\n").forEach(l => { l = l.trim(); if (!l) return; if (l.startsWith("## ")) sub = l.slice(3); else if (l.startsWith("# ")) m = l.slice(2); else rows.push({ m, sub, name: l.split("|")[0].trim() }); });
  return rows;
});

test("most strength exercises have a movement animation, and every rule names a real pattern", async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(async lib => {
    const { patternKey, PATTERNS, RULES } = await import("/js/movements.js");
    const rows = (await eval(lib)()).filter(x => x.m !== "Cardio" && x.m !== "Mobility");
    const missing = rows.filter(x => !patternKey(x.name, x.m, x.sub)).map(x => x.name);
    return { total: rows.length, missing, bad: RULES.map(r => r[1]).filter(k => k && !PATTERNS[k]) };
  }, `(${library})`);
  expect(r.bad).toEqual([]);
  expect(r.missing.length / r.total).toBeLessThan(0.05);
  expect(errors).toEqual([]);
});

test("every pattern draws cleanly at the start, middle and end, with each kind of weight", async ({ page }) => {
  const errors = await openApp(page);
  const broken = await page.evaluate(async () => {
    const { PATTERNS } = await import("/js/movements.js"), { figureMarkup } = await import("/js/figure.js");
    const out = [];
    for (const [k, p] of Object.entries(PATTERNS)) for (const kind of ["barbell", "dumbbell", "kettlebell", "cable", "none"]) for (const t of [0, .5, 1]) {
      const s = figureMarkup(p, t, { Chest: 1, Back: 1, Quadriceps: 1, Hamstrings: 1, Glutes: .38, Triceps: .38, Shoulders: 1 }, kind);
      if (/NaN|undefined/.test(s) || s.length < 200) out.push(`${k}/${kind}/${t}`);
    }
    return out;
  });
  expect(broken).toEqual([]);
  expect(errors).toEqual([]);
});

test("the chosen exercise shows a moving picture that opens the how-to sheet", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Romanian deadlift");
  const thumb = page.locator("#ex-thumb");
  await expect(thumb).toBeVisible();
  const box = await page.locator("#ex-chosen-text").boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  // It animates.
  const first = await thumb.innerHTML();
  await expect.poll(() => thumb.innerHTML(), { timeout: 3000 }).not.toBe(first);
  await page.click("#ex-chosen-text");
  const sheet = page.locator("#exsheet");
  await expect(sheet).toBeVisible();
  await expect(page.locator("#exs-title")).toHaveText("Romanian deadlift");
  await expect(page.locator("#exs-anim path").first()).toBeAttached();
  await expect(page.locator("#exs-steps li")).toHaveCount(3);
  await expect(page.locator("#exs-muscles-text")).toContainText("Hamstrings");
  await expect(page.locator("#exs-muscles-text")).toContainText("Glutes");
  await expect(page.locator('#exs-map [data-m="Hamstrings"]').first()).toHaveAttribute("fill-opacity", "1");
  // Name and muscles are tucked under Edit.
  await expect(page.locator("#exs-name")).toBeHidden();
  await page.click("#exs-edit");
  await expect(page.locator("#exs-name")).toBeVisible();
  await page.click("#exs-cancel");
  await expect(sheet).toBeHidden();
  expect(errors).toEqual([]);
});

test("shoulder exercises highlight only the delt head they work", async ({ page }) => {
  const errors = await openApp(page);
  for (const [name, head, label] of [["Dumbbell lateral raise — standing", "side", "Side delts"], ["Reverse pec deck", "rear", "Rear delts"], ["Barbell overhead press", "front", "Front delts"]]) {
    await pickExercise(page, name);
    await page.click("#ex-chosen-text");
    await expect(page.locator("#exs-muscles-text")).toContainText(label);
    const marked = await page.locator("#exs-map [data-m^='Shoulders']").evaluateAll(els => [...new Set(els.filter(e => e.getAttribute("fill-opacity") === "1").map(e => e.dataset.m))]);
    expect(marked).toEqual([`Shoulders:${head}`]);
    await page.click("#exs-close");
    await page.click("#ex-change");
  }
  expect(errors).toEqual([]);
});

test("with reduced motion the pictures hold still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = await openApp(page);
  await pickExercise(page, "Romanian deadlift");
  const thumb = page.locator("#ex-thumb");
  await expect(thumb).toHaveAttribute("data-still", "1");
  const first = await thumb.innerHTML();
  await page.waitForTimeout(700);
  expect(await thumb.innerHTML()).toBe(first);
  expect(errors).toEqual([]);
});

test("search results show a picture, and you can browse by movement", async ({ page }) => {
  const errors = await openApp(page, { entries: [set({ date: "2026-03-01", exercise: "Leg press", muscle: "Quadriceps", weight: 300, reps: 10 })] });
  await page.fill("#exercise-search", "seated cable row");
  await expect(page.locator('#ex-results [data-name="Seated cable row"] .ex-th svg')).toBeAttached();
  await page.fill("#exercise-search", "");
  const tile = page.locator('#ex-results [data-move="Row"]');
  await expect(tile).toBeVisible();
  const tb = await tile.boundingBox();
  expect(tb.height).toBeGreaterThanOrEqual(40);
  await tile.click();
  await expect(page.locator("#ex-results .ex-sec").first()).toContainText("Row");
  await expect(page.locator('#ex-results [data-name="Seated cable row"]')).toBeVisible();
  await page.click("#ex-results [data-move-back]");
  await expect(page.locator('#ex-results [data-move="Row"]')).toBeVisible();
  await page.click('#ex-results [data-move="Row"]');
  await page.click('#ex-results [data-name="Seated cable row"]');
  await expect(page.locator("#ex-chosen-name")).toHaveText("Seated cable row");
  expect(errors).toEqual([]);
});

test("cardio machines show a looping picture with no muscles; other cardio has none", async ({ page }) => {
  const errors = await openApp(page);
  await pickExercise(page, "Treadmill");
  const thumb = page.locator("#ex-thumb");
  await expect(thumb).toBeVisible();
  const first = await thumb.innerHTML();
  expect(first).not.toContain("var(--red)");
  await expect.poll(() => thumb.innerHTML(), { timeout: 3000 }).not.toBe(first);
  await expect(page.locator("#ex-chosen-tip")).toBeHidden();
  await page.click("#ex-chosen-text");
  await expect(page.locator("#exs-anim")).toBeVisible();
  await expect(page.locator(".exs-cap")).toBeHidden();
  await expect(page.locator("#exs-steps li")).toHaveCount(0);
  await expect(page.locator("#exs-name")).toBeVisible();
  await page.click("#exs-cancel");
  await page.click("#ex-change");
  await pickExercise(page, "Swim");
  await expect(page.locator("#ex-thumb")).toBeHidden();
  await page.click("#ex-chosen-text");
  await expect(page.locator("#exs-anim")).toBeHidden();
  await expect(page.locator("#exs-name")).toBeVisible();
  expect(errors).toEqual([]);
});

test("the newer movements match the right pictures", async ({ page }) => {
  const errors = await openApp(page);
  const wrong = await page.evaluate(async () => {
    const { patternKey } = await import("/js/movements.js");
    const want = [
      ["Dumbbell wrist curl", "Forearms", "Wrist flexors", "wristCurl"], ["Barbell reverse wrist curl", "Forearms", "Wrist extensors", "reverseWristCurl"],
      ["Dumbbell side bend", "Abdominals", "Obliques / lateral trunk", "sideBend"], ["Cable woodchop", "Abdominals", "Obliques / lateral trunk", "chop"],
      ["High-to-low cable chop", "Abdominals", "Obliques / lateral trunk", "chop"], ["Low-to-high cable chop", "Abdominals", "Obliques / lateral trunk", "chopUp"],
      ["Standing cable rotation", "Abdominals", "Obliques / lateral trunk", "rotation"], ["Pallof press", "Abdominals", "Obliques / lateral trunk", "rotation"],
      ["Stationary bike", "Cardio", "Machines", "bike"], ["Air bike", "Cardio", "Machines", "bike"], ["Treadmill", "Cardio", "Machines", "treadmill"],
      ["Rowing machine", "Cardio", "Machines", "rower"], ["Swim", "Cardio", "Outdoor", null], ["Elliptical", "Cardio", "Machines", null],
      ["Inverted row", "Back", "Bodyweight", "invertedRow"], ["Ring row", "Back", "Bodyweight", "invertedRow"],
      ["Pike push-up", "Shoulders", "Bodyweight", "pikePushUp"], ["Handstand push-up", "Shoulders", "Bodyweight", "handstandPushUp"],
      ["Nordic hamstring curl", "Hamstrings", "Leg curl: bodyweight", "nordic"], ["Glute-ham raise", "Hamstrings", "Bodyweight", "nordic"],
      ["Reverse Nordic", "Quadriceps", "Knee extension", null], ["Mountain climber", "Abdominals", "Bodyweight: planks & calisthenics", "mountainClimber"],
      ["Burpee", "Full body", "Bodyweight", "squatThrust"], ["Wall sit", "Quadriceps", "Bodyweight", "wallSit"],
      ["Dead bug", "Abdominals", "Bodyweight: planks & calisthenics", "deadBug"], ["Hollow body hold", "Abdominals", "Bodyweight: planks & calisthenics", "hollow"],
      ["Superman", "Lower back", "Bodyweight", "superman"], ["Bird dog", "Lower back", "Bodyweight", "birdDog"], ["Donkey kick", "Glutes", "Bodyweight", "donkeyKick"],
      ["Reverse hyperextension", "Lower back", "Back extension", "reverseHyper"], ["Dumbbell Y-raise", "Back", "Mid / lower traps", "yRaise"],
      ["Kettlebell clean", "Full body", "Kettlebell", "kbClean"], ["Kettlebell snatch", "Full body", "Kettlebell", "kbSnatch"],
      ["Kettlebell thruster", "Full body", "Kettlebell", "thruster"], ["Snatch-grip row", "Back", "Rows: barbell", "bentRow"],
      ["Snatch-grip RDL", "Hamstrings", "Hip hinge: barbell", "hinge"], ["Hanging knee raise with rotation", "Abdominals", "Obliques / lateral trunk", "legRaise"],
    ];
    return want.filter(([n, m, s, k]) => patternKey(n, m, s) !== k).map(([n, m, s, k]) => `${n}: ${patternKey(n, m, s)} (want ${k})`);
  });
  expect(wrong).toEqual([]);
  expect(errors).toEqual([]);
});

test("looping movements come back to the start, and side bends tilt the upper body", async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(async () => {
    const { PATTERNS } = await import("/js/movements.js"), { figureMarkup } = await import("/js/figure.js");
    const loops = Object.entries(PATTERNS).filter(([, p]) => p.loop).map(([k, p]) => ({ k, moves: figureMarkup(p, 0) !== figureMarkup(p, .5), back: figureMarkup(p, 0) === figureMarkup(p, 1) }));
    return { loops, still: figureMarkup(PATTERNS.sideBend, 0).includes("rotate("), tilted: figureMarkup(PATTERNS.sideBend, 1).includes("rotate(") };
  });
  expect(r.loops.map(x => x.k).sort()).toEqual(["bike", "treadmill"]);
  for (const x of r.loops) { expect(x.moves).toBe(true); expect(x.back).toBe(true); }
  expect(r.still).toBe(false);
  expect(r.tilted).toBe(true);
  expect(errors).toEqual([]);
});

test("browse by movement lists lifting movements only, not cardio machines", async ({ page }) => {
  const errors = await openApp(page);
  await expect(page.locator('#ex-results [data-move="Row"]')).toBeVisible();
  await expect(page.locator('#ex-results [data-move="Nordic curl"]')).toBeVisible();
  await expect(page.locator('#ex-results [data-move="Bike"]')).toHaveCount(0);
  await expect(page.locator('#ex-results [data-move="Treadmill"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
