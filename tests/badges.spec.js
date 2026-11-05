const { test, expect } = require("@playwright/test");
const { TODAY, set, cardio, openApp, bodyWeight } = require("./helpers");

// Body weight 180 lb from well before any test date, so every earlier day has one.
const bw180 = (extra = {}) => bodyWeight(180, "lb", { bwLog: { "2026-01-01": { w: 180, unit: "lb" } }, ...extra });
const ex = (name, sets, date = TODAY) => sets.map(([weight, reps]) => set({ date, exercise: name, muscle: "Other", weight, reps }));
const day = (page, d = TODAY) => page.locator(`#history #day-${d}`);
const group = (page, name, d) => day(page, d).locator(".ex-group").filter({ has: page.locator("h3", { hasText: name }) });
async function openHistory(page, opts) {
  const errors = await openApp(page, opts);
  await page.click('nav.tabs [data-tab="history"]');
  return errors;
}

test("a record and a milestone can both show, with the reason under the bars", async ({ page }) => {
  const errors = await openHistory(page, { entries: [
    ...ex("High-bar back squat", [[185, 5], [205, 5]], "2026-02-25"),
    ...ex("High-bar back squat", [[205, 5], [225, 3]]),
  ] });
  const g = group(page, "High-bar back squat");
  await expect(g.locator(".pr")).toHaveText(["2 plates", "PR"]);
  await expect(g.locator(".pr.ms")).toHaveText("2 plates");
  await expect(g.locator(".ex-foot")).toHaveText("2 plates: first time at 225 lb · PR: est. 1RM 248 lb, up from 239 lb");
  expect(errors).toEqual([]);
});

test("rep PR, heaviest and volume PR", async ({ page }) => {
  const prev = "2026-02-25";
  const errors = await openHistory(page, { entries: [
    ...ex("Lat pulldown — wide overhand", [[160, 6], [140, 8]], prev), ...ex("Lat pulldown — wide overhand", [[140, 10]]),
    ...ex("Seated cable row", [[175, 8]], prev), ...ex("Seated cable row", [[190, 1]]),
    ...ex("Romanian deadlift", [[185, 10], [185, 10], [185, 10]], prev), ...ex("Romanian deadlift", [[185, 10], [185, 10], [185, 10], [185, 10]]),
  ] });
  await expect(group(page, "Lat pulldown").locator(".pr")).toHaveText(["Rep PR"]);
  await expect(group(page, "Lat pulldown").locator(".ex-foot")).toHaveText("Rep PR: 10 reps at 140 lb, up from 8 · est. 1RM 187 lb");
  await expect(group(page, "Seated cable row").locator(".pr")).toHaveText(["Heaviest"]);
  await expect(group(page, "Seated cable row").locator(".ex-foot")).toContainText("Heaviest: 190 lb, up from 175 lb");
  await expect(group(page, "Romanian deadlift").locator(".pr")).toHaveText(["Volume PR"]);
  await expect(group(page, "Romanian deadlift").locator(".ex-foot")).toContainText("Volume PR: 7,400 lb, up from 5,550 lb");
  expect(errors).toEqual([]);
});

test("new, back after a break, and the first session gets no records", async ({ page }) => {
  const errors = await openHistory(page, { entries: [
    ...ex("Leg press", [[360, 10]], "2026-01-20"), ...ex("Leg press", [[300, 10]]),
    ...ex("Incline dumbbell press", [[50, 10]]),
  ] });
  await expect(group(page, "Leg press").locator(".pr.nw")).toHaveText(["Back"]);
  await expect(group(page, "Leg press").locator(".ex-foot")).toContainText("Back: first time in 43 days");
  await expect(group(page, "Incline dumbbell press").locator(".pr")).toHaveText(["New"]);
  await expect(group(page, "Leg press", "2026-01-20").locator(".pr")).toHaveText(["New"]);
  expect(errors).toEqual([]);
});

test("tier up needs chosen standards; body-weight multiples don't", async ({ page }) => {
  const prev = "2026-02-25", entries = [
    ...ex("Conventional deadlift", [[315, 5]], prev), ...ex("Conventional deadlift", [[365, 5]]),
    ...ex("Barbell bench press — flat", [[145, 5]], prev), ...ex("Barbell bench press — flat", [[165, 5]]),
  ];
  let errors = await openHistory(page, { entries, settings: bw180({ profile: { std: "men" } }) });
  await expect(group(page, "Conventional deadlift").locator(".pr")).toHaveText(["Tier up", "PR"]);
  await expect(group(page, "Conventional deadlift").locator(".ex-foot")).toContainText("Tier up: Intermediate → Advanced (app's estimate)");
  expect(errors).toEqual([]);
});

test("body weight multiple without standards chosen", async ({ page }) => {
  const errors = await openHistory(page, { entries: [
    ...ex("Barbell bench press — flat", [[145, 5]], "2026-02-25"), ...ex("Barbell bench press — flat", [[165, 5]]),
  ], settings: bw180() });
  await expect(group(page, "Barbell bench press").locator(".pr")).toHaveText(["1× BW", "PR"]);
  await expect(group(page, "Barbell bench press").locator(".ex-foot")).toContainText("1× body weight: est. 1RM 193 lb at 180 lb body weight");
  expect(errors).toEqual([]);
});

test("day badges: biggest day and workout count", async ({ page }) => {
  // 24 earlier training days, one set each; today is the 25th and the biggest.
  const earlier = Array.from({ length: 24 }, (_, i) => set({ date: `2026-02-${String(i + 1).padStart(2, "0")}`, exercise: "Leg press", muscle: "Quadriceps", weight: 200, reps: 10 }));
  const errors = await openHistory(page, { entries: [...earlier, ...ex("Leg press", [[200, 10], [200, 10]])] });
  await expect(day(page).locator(".day-head .pr")).toHaveText(["Biggest day", "25th workout"]);
  await expect(day(page, "2026-02-24").locator(".day-head .pr")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("cardio bests: longest and fastest", async ({ page }) => {
  const errors = await openHistory(page, { entries: [
    cardio({ date: "2026-02-25", exercise: "Treadmill", minutes: 30, distance: 3.1, distUnit: "mi" }),
    cardio({ exercise: "Treadmill", minutes: 34, distance: 3.8, distUnit: "mi" }),
    cardio({ date: "2026-02-25", exercise: "Outdoor run", minutes: 30, distance: 3.1, distUnit: "mi" }),
    cardio({ exercise: "Outdoor run", minutes: 27, distance: 3.1, distUnit: "mi" }),
  ] });
  // Fastest only compares runs at least 90% as long, so the longer treadmill run is just Longest.
  await expect(group(page, "Treadmill").locator(".pr")).toHaveText(["Longest"]);
  await expect(group(page, "Treadmill").locator(".ex-foot")).toContainText("Longest: 3.8 mi, up from 3.1 mi");
  await expect(group(page, "Outdoor run").locator(".pr")).toHaveText(["Fastest"]);
  expect(errors).toEqual([]);
});

test("the Log tab shows badges on today's sets, without the reason line", async ({ page }) => {
  const errors = await openApp(page, { entries: [
    ...ex("High-bar back squat", [[205, 5]], "2026-02-25"), ...ex("High-bar back squat", [[225, 3]]),
  ] });
  const g = page.locator("#day-list .ex-group");
  await expect(g.locator(".pr")).toHaveText(["2 plates", "PR"]);
  await expect(g.locator(".ex-foot")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("streak milestones show on Progress", async ({ page }) => {
  const days = ["02-09", "02-10", "02-11", "02-16", "02-17", "02-18", "02-23", "02-24", "02-25", "03-02", "03-03", "03-04"];
  const errors = await openApp(page, { entries: days.map(d => set({ date: `2026-${d}`, exercise: "Leg press", muscle: "Quadriceps", weight: 200, reps: 10 })) });
  await page.click('nav.tabs [data-tab="progress"]');
  await expect(page.locator(".streak")).toContainText("4-week streak");
  await expect(page.locator(".streak .pr.ms")).toHaveText("Milestone");
  expect(errors).toEqual([]);
});
