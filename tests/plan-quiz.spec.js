const { test, expect } = require("@playwright/test");
const { openApp } = require("./helpers");

const openPlan = page => page.click('nav.tabs [data-tab="plan"]');
const pick = (page, q, v) => page.click(`[data-qa="${q}"][data-v="${v}"]`);
const next = page => page.click("#qz-next");
async function answer(page, { goal = "muscle", where = "gym", days = [0, 1, 3, 4], exp = "some", mins = 60, focus = ["arms"] } = {}) {
  await pick(page, "goal", goal); await next(page);
  await pick(page, "where", where); await next(page);
  for (const d of days) await pick(page, "days", d);
  await next(page);
  await pick(page, "exp", exp); await next(page);
  await pick(page, "mins", mins); await next(page);
  for (const f of focus) await pick(page, "focus", f);
  await next(page);
}
const program = page => page.evaluate(() => (JSON.parse(localStorage.getItem("liftlog.settings.v1")) || {}).program);

test("Build your own asks six questions, then opens the editor with the plan filled in", async ({ page }) => {
  const errors = await openApp(page);
  await openPlan(page);
  // The templates are unchanged; Build your own is still last.
  await expect(page.locator(".tpl b")).toHaveText(["Push / Pull / Legs", "Bro split", "Full body", "Progressive (linear strength)", "Hypertrophy (upper / lower)", "Powerlifting", "Mobility", "Build your own"]);
  await page.click('[data-tpl="__quiz"]');
  await expect(page.locator(".qz-step")).toHaveText("Question 1 of 6");
  await expect(page.locator("#qz-next")).toBeDisabled();
  await answer(page);
  await expect(page.locator("#plan-root h2").first()).toHaveText("My plan: build muscle");
  await expect(page.locator(".qz-note")).toContainText("Build muscle · Full gym · 4 days · Some experience · 60 min · Arms");
  await expect(page.locator(".wk-card b")).toHaveText(["Upper A", "Lower A", "Upper B", "Lower B"]);
  // Editable like any program.
  await page.locator(".wk-card").first().locator("[data-pedit]").click();
  await expect(page.locator(".wk-card.open")).toBeVisible();
  const pr = await program(page);
  expect(pr.template).toBe("quiz");
  expect(pr.quiz).toEqual({ goal: "muscle", where: "gym", days: [0, 1, 3, 4], exp: "some", mins: 60, focus: ["arms"] });
  const names = pr.workouts.map(w => w.name), at = i => pr.workouts.find(w => w.id === pr.days[i])?.name || null;
  expect([0, 1, 2, 3, 4, 5, 6].map(at)).toEqual(["Upper A", "Lower A", null, "Upper B", "Lower B", null, null]);
  expect(pr.rotation.map(id => names[pr.workouts.findIndex(w => w.id === id)])).toEqual(["Upper A", "Lower A", "Upper B", "Lower B"]);
  // 60 minutes is 6 exercises; the arms focus adds one more somewhere in the week.
  expect(pr.workouts.reduce((s, w) => s + w.items.length, 0)).toBe(6 * 4 + 1);
  expect(errors).toEqual([]);
});

test("the plan fits the answers: days, goal, experience and time", async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(async () => {
    const { buildPlan } = await import("/js/plan-quiz.js");
    const { EX_INDEX } = await import("/js/search.js");
    const unknown = new Set(), counts = [];
    const wrongKit = new Set(), short = new Set(), dupes = new Set();
    const NOT = { db: /machine|cable|barbell|lat pulldown|leg press|ez-bar|pull-up|chin-up/i, bw: /machine|cable|barbell|dumbbell|lat pulldown|leg press|ez-bar/i };
    for (const goal of ["muscle", "strength", "fat", "fit"]) for (const where of ["gym", "db", "bw"]) for (const n of [2, 3, 4, 5, 6]) for (const exp of ["new", "some", "exp"]) for (const mins of [30, 45, 60, 75]) {
      const pr = buildPlan({ goal, where, days: [0, 1, 2, 3, 4, 5].slice(0, n), exp, mins, focus: ["arms", "glutes"] });
      pr.workouts.forEach(w => {
        w.items.forEach(it => {
          if (!EX_INDEX.has(it.exercise.toLowerCase())) unknown.add(it.exercise);
          if (NOT[where] && NOT[where].test(it.exercise)) wrongKit.add(where + ": " + it.exercise);
        });
        if (w.items.length < { 30: 4, 45: 5, 60: 6, 75: 7 }[mins]) short.add(where + " " + w.name + " " + mins);
        if (new Set(w.items.map(it => it.exercise)).size < w.items.length) dupes.add(where + " " + w.name);
      });
      counts.push(pr.days.filter(Boolean).length === n);
    }
    const one = a => buildPlan({ days: [0, 2, 4], exp: "some", mins: 45, focus: [], ...a });
    return {
      unknown: [...unknown], counts: counts.every(Boolean), wrongKit: [...wrongKit], short: [...short], dupes: [...dupes],
      homeCardio: buildPlan({ goal: "fat", where: "db", days: [0, 2, 4], exp: "new", mins: 45, focus: [] }).workouts[0].items.at(-1),
      bwFirst: buildPlan({ goal: "strength", where: "bw", days: [0, 2, 4], exp: "some", mins: 45, focus: [] }).workouts[0].items[0].exercise,
      strength: one({ goal: "strength" }).workouts[0].items[0],
      fat: one({ goal: "fat", exp: "new" }).workouts[0].items,
      split2: buildPlan({ goal: "fit", days: [1, 4], exp: "new", mins: 30, focus: [] }).workouts.map(w => w.name),
      split3exp: one({ goal: "muscle", exp: "exp" }).workouts.map(w => w.name),
      split3: one({ goal: "muscle" }).workouts.map(w => w.name),
      split5: buildPlan({ goal: "muscle", days: [0, 1, 2, 3, 4], exp: "some", mins: 60, focus: [] }).workouts.map(w => w.name),
      split6: buildPlan({ goal: "muscle", days: [0, 1, 2, 3, 4, 5], exp: "exp", mins: 60, focus: [] }).workouts.map(w => w.name),
    };
  });
  expect(r.unknown).toEqual([]);
  expect(r.wrongKit).toEqual([]);
  expect(r.short).toEqual([]);
  expect(r.dupes).toEqual([]);
  expect(r.homeCardio).toEqual({ exercise: "Walk", minutes: 15 });
  expect(r.bwFirst).toBe("Bodyweight squat");
  expect(r.counts).toBe(true);
  expect(r.strength).toMatchObject({ exercise: "High-bar back squat", lo: 4, hi: 6 });
  expect(r.fat.length).toBe(5);
  expect(r.fat[0]).toMatchObject({ exercise: "Leg press", sets: 2, lo: 10, hi: 15 });
  expect(r.fat[4]).toEqual({ exercise: "Incline treadmill walk", minutes: 15 });
  expect(r.split2).toEqual(["Full body A", "Full body B"]);
  expect(r.split3).toEqual(["Full body A", "Full body B", "Full body C"]);
  expect(r.split3exp).toEqual(["Push", "Pull", "Legs"]);
  expect(r.split5).toEqual(["Upper", "Lower", "Push", "Pull", "Legs"]);
  expect(r.split6).toEqual(["Push", "Pull", "Legs"]);
  expect(errors).toEqual([]);
});

test("days must be 2 to 6, and Back on the first question leaves the quiz", async ({ page }) => {
  const errors = await openApp(page);
  await openPlan(page);
  await page.click('[data-tpl="__quiz"]');
  await pick(page, "goal", "fit"); await next(page);
  await pick(page, "where", "bw"); await next(page);
  await pick(page, "days", 0);
  await expect(page.locator("#qz-next")).toBeDisabled();
  for (const d of [1, 2, 3, 4, 5, 6]) await pick(page, "days", d);
  await expect(page.locator("#qz-next")).toBeDisabled();
  await expect(page.locator(".qz-count")).toHaveText("7 days. Pick 2 to 6 so you get rest days.");
  await pick(page, "days", 6);
  await expect(page.locator(".qz-count")).toHaveText("6 days a week");
  await page.click("#qz-back"); await page.click("#qz-back"); await page.click("#qz-back");
  await expect(page.locator(".tpl")).toHaveCount(8);
  expect(await program(page)).toBeFalsy();
  expect(errors).toEqual([]);
});

test("Change answers starts from the saved answers and asks before replacing", async ({ page }) => {
  const errors = await openApp(page);
  await openPlan(page);
  await page.click('[data-tpl="__quiz"]');
  await answer(page);
  await page.click("[data-quiz-redo]");
  await expect(page.locator('[data-qa="goal"][data-v="muscle"]')).toHaveAttribute("aria-pressed", "true");
  await pick(page, "goal", "strength");
  for (let i = 0; i < 6; i++) await next(page);
  await expect(page.locator("#dlg")).toBeVisible();
  await page.click("#dlg-ok");
  await expect(page.locator("#plan-root h2").first()).toHaveText("My plan: get stronger");
  expect((await program(page)).quiz.goal).toBe("strength");
  expect(errors).toEqual([]);
});

test("programs saved before the quiz still open as they were", async ({ page }) => {
  // An empty "build your own" program and a template program, in the old format (no quiz answers).
  const blank = { name: "My program", template: "__blank", mode: "fixed", days: [null, null, null, null, null, null, null], rotation: [], workouts: [],
    prog: { on: true, upper: 5, lower: 10, unit: "lb" }, deloadEvery: 0, start: "2026-03-02", done: {}, override: null };
  let errors = await openApp(page, { settings: { program: blank } });
  await openPlan(page);
  await expect(page.locator("#plan-root h2").first()).toHaveText("My program");
  await expect(page.locator(".qz-note")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a quiz plan saved before the home or gym question counts as a full gym", async ({ page }) => {
  const errors = await openApp(page);
  const pr = await page.evaluate(async () => {
    const { buildPlan } = await import("/js/plan-quiz.js");
    const p = buildPlan({ goal: "muscle", days: [0, 2, 4], exp: "some", mins: 45, focus: [] });
    delete p.quiz.where;   // the old format had no "where"
    return p;
  });
  await page.evaluate(p => { const s = JSON.parse(localStorage.getItem("liftlog.settings.v1")) || {}; s.program = p; localStorage.setItem("liftlog.settings.v1", JSON.stringify(s)); }, pr);
  await page.reload();
  await openPlan(page);
  await expect(page.locator(".qz-note")).toContainText("Build muscle · Full gym · 3 days");
  await page.click("[data-quiz-redo]");
  await next(page);
  await expect(page.locator('[data-qa="where"][data-v="gym"]')).toHaveAttribute("aria-pressed", "true");
  expect(errors).toEqual([]);
});
