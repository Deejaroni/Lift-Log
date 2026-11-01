// Realistic sample data for screenshots, UI audits and mockups: about six weeks of training ending on `today`.
// Covers straight sets, a drop set, failure and reps-left marks, a superset, one-side and per-hand sets,
// cardio with machine details, mobility, body weight records and a strength profile.
// Usage: const { demo } = require("./fixtures/demo"); demo("2026-03-04") → { entries, settings, prefs }.

const iso = d => d.toISOString().slice(0, 10);
const shift = (day, n) => { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

function demo(today) {
  let n = 0, ts = Date.parse(today + "T12:00:00Z") - 60 * 864e5;
  const entries = [];
  const add = (date, o) => { ts += 60000; entries.push({ id: `demo${++n}`, date, unit: "lb", sets: 1, note: "", ts, ...o }); };
  const lift = (date, exercise, muscle, weight, reps, o = {}) => add(date, { exercise, muscle, weight, reps, ...o });
  const cardio = (date, exercise, minutes, o = {}) => add(date, { kind: "cardio", exercise, muscle: "Cardio", weight: 0, reps: 0, effort: "moderate", minutes, ...o });

  // Six weeks of upper / lower / cardio, Monday, Wednesday, Friday, Saturday, getting a little stronger each week.
  for (let w = 5; w >= 0; w--) {
    const mon = shift(today, -7 * w - ((new Date(today + "T12:00:00Z").getUTCDay() + 6) % 7));
    const up = 5 * (5 - w), d = k => shift(mon, k);
    if (d(0) <= today) {
      [0, 1, 2].forEach(i => lift(d(0), "Barbell bench press — flat", "Chest", 165 + up, 6 - (i === 2 ? 1 : 0), { equip: { bb: { bar: 45 } }, ...(i === 2 ? { rir: 1 } : {}) }));
      [0, 1].forEach(() => lift(d(0), "Seated cable row — wide grip", "Back", 120 + up, 10, { ss: `ss${w}`, ssLead: true }));
      [0, 1].forEach(() => lift(d(0), "Dumbbell lateral raise — standing", "Shoulders", 20, 14, { equip: { db: { each: true } }, ss: `ss${w}` }));
      lift(d(0), "Rope pushdown", "Triceps", 50 + up / 5, 12, { failure: true });
    }
    if (d(2) <= today) {
      [0, 1, 2].forEach(() => lift(d(2), "High-bar back squat", "Quadriceps", 205 + up, 5, { equip: { bb: { bar: 45 } } }));
      [0, 1].forEach(() => lift(d(2), "Romanian deadlift", "Hamstrings", 185 + up, 8));
      lift(d(2), "Bulgarian split squat", "Glutes", 35, 10, { equip: { db: { side: "One side (unilateral)", each: true } } });
      const chain = `chain${w}`;
      [[90, 12], [70, 10], [50, 10]].forEach(([wt, r], step) => lift(d(2), "Seated hip abduction machine", "Glutes", wt, r, { chain, step }));
    }
    if (d(4) <= today) {
      cardio(d(4), "Treadmill", 25, { distance: 1.6, distUnit: "mi", extra: { speed: 3.8, speedUnit: "mph", incline: 6 } });
      cardio(d(4), "Rowing machine", 12, { distance: 2500, distUnit: "m", effort: "vigorous", extra: { splitSec: 144 } });
      add(d(4), { kind: "mobility", exercise: "Hip flexor stretch", muscle: "Mobility", weight: 0, reps: 0, minutes: 8, effort: "light" });
    }
    if (d(5) <= today) {
      [0, 1, 2].forEach(() => lift(d(5), "Pull-up", "Back", w < 3 ? 10 : 0, 8, { equip: { bw: {} } }));
      [0, 1, 2].forEach(() => lift(d(5), "Seated dumbbell shoulder press", "Shoulders", 45 + up / 5, 10, { equip: { db: { each: true } } }));
      [0, 1].forEach(() => lift(d(5), "EZ-bar curl", "Biceps", 60, 12));
    }
  }
  // Today: a session in progress, so the Log tab's list, totals and ring have something to show.
  lift(today, "Barbell bench press — flat", "Chest", 195, 5, { equip: { bb: { bar: 45 } }, rir: 2 });
  lift(today, "Barbell bench press — flat", "Chest", 195, 5, { equip: { bb: { bar: 45 } }, failure: true });
  cardio(today, "Stationary bike", 15, { extra: { watts: 140 } });

  const bwLog = {};
  [42, 35, 28, 21, 14, 7, 0].forEach((back, i) => { bwLog[shift(today, -back)] = { w: 184 - i * 0.6, unit: "lb" }; });
  return {
    entries,
    settings: { bw: 180.4, bwUnit: "lb", days: {}, bwLog, exercises: {}, profile: { std: "men", birthYear: 1981 } },
    prefs: { unit: "lb", weekGoal: 3, lastBackup: shift(today, -3), theme: "auto" },
  };
}

module.exports = { demo };
