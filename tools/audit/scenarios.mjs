// What the UI audit opens the app with. Every scenario but "first launch" starts from the sample data in
// tests/fixtures/demo.js with the push/pull/legs plan loaded.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { demo } = require("../../tests/fixtures/demo.js");

// Long names and big numbers in kg: the widest text each screen is likely to meet.
export function stress(today) {
  const d = demo(today), kg = w => Math.round(w * 2.5 * 2) / 2;
  d.entries = d.entries.map(e => ({ ...e, unit: "kg", weight: e.kind ? e.weight : kg(e.weight) }));
  let ts = Date.parse(today + "T18:00:00Z");
  const big = (exercise, muscle, weight, reps, o = {}) => d.entries.push({ id: `stress${ts}`, date: today, unit: "kg", sets: 1, note: "", ts: ts++, exercise, muscle, weight, reps, ...o });
  big("Single-arm half-kneeling landmine press with rotation", "Shoulders", 1000, 25, { sets: 10, note: "Felt strong today, kept the elbow tucked and paused at the top of every rep for a full second." });
  big("Barbell bench press — flat", "Chest", 487.5, 10, { equip: { bb: { bar: 20 } } });
  d.entries.push({ id: "stress-cardio", kind: "cardio", date: today, exercise: "Treadmill", muscle: "Cardio", effort: "vigorous", unit: "kg", weight: 0, reps: 0, sets: 1, note: "",
    ts: ts++, minutes: 185, distance: 42.2, distUnit: "km", extra: { speed: 13.7, speedUnit: "km/h", incline: 1 } });
  for (const k in d.settings.bwLog) d.settings.bwLog[k] = { w: Math.round(d.settings.bwLog[k].w / 2.2046 * 10) / 10, unit: "kg" };
  Object.assign(d.settings, { bw: 81.8, bwUnit: "kg" });
  d.prefs.unit = "kg";
  return d;
}

// zoom: everything drawn larger, like a phone's text size setting (Chrome on Android zooms the page this way).
export const SCENARIOS = [
  { id: "main", title: "Sample data", modes: ["light", "dark"], seed: demo, screens: "all" },
  { id: "first", title: "First launch (no data)", modes: ["light", "dark"], seed: () => ({ entries: [] }), plan: false,
    screens: ["Log: top", "Plan", "History", "Progress: top"] },
  { id: "stress", title: "Long names, big numbers, kg", modes: ["light"], seed: stress,
    screens: ["Log: top", "Log: today's sets", "History", "Progress: top", "Progress: charts"] },
  { id: "text130", title: "Text size 130%", modes: ["light"], seed: demo, zoom: 1.3,
    screens: ["Log: top", "Log: form", "Log: today's sets", "Plan", "History", "Progress: top", "Settings"] },
  { id: "text200", title: "Text size 200%", modes: ["light"], seed: demo, zoom: 2,
    screens: ["Log: top", "Log: form", "Plan", "History", "Progress: top", "Settings"] },
];
