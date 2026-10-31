// Shared setup: a fixed "today", seeded localStorage, and console-error capture.
const TODAY = "2026-03-04"; // a Wednesday

let n = 0;
// A logged strength set. Small ts values keep the calorie estimate on the "from set count" path.
const set = o => ({ id: `s${++n}`, date: TODAY, unit: "lb", sets: 1, note: "", ts: n, ...o });
const cardio = o => ({ id: `c${++n}`, kind: "cardio", date: TODAY, muscle: "Cardio", effort: "moderate", unit: "lb", weight: 0, reps: 0, sets: 1, note: "", ts: n, ...o });

// Opens the app with the given localStorage contents. Returns the list of console errors seen.
async function openApp(page, { entries = [], settings = null, prefs = null } = {}) {
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));
  await page.clock.setFixedTime(new Date(`${TODAY}T12:00:00Z`));
  await page.addInitScript(seed => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.clear();
    localStorage.setItem("liftlog.entries.v1", JSON.stringify(seed.entries));
    if (seed.settings) localStorage.setItem("liftlog.settings.v1", JSON.stringify(seed.settings));
    if (seed.prefs) localStorage.setItem("liftlog.prefs.v1", JSON.stringify(seed.prefs));
  }, { entries, settings, prefs });
  await page.goto("/");
  return errors;
}

// Body weight recorded for TODAY.
const bodyWeight = (w, unit, extra = {}) => ({ bw: w, bwUnit: unit, days: {}, bwLog: { [TODAY]: { w, unit } }, ...extra });

// Chooses an exercise on the Log tab by searching for its exact name and tapping the result.
async function pickExercise(page, name) {
  await page.fill("#exercise-search", name);
  await page.click(`#ex-results [data-name="${name}"]`);
}

module.exports = { TODAY, set, cardio, openApp, bodyWeight, pickExercise };
