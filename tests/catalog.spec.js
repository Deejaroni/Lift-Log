const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { set, openApp, pickExercise } = require("./helpers");

// The built-in library, read straight from the page source.
function library() {
  const src = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const start = src.indexOf("const CATALOG_TEXT = `") + "const CATALOG_TEXT = `".length;
  const rows = []; let muscle = null, sub = null;
  src.slice(start, src.indexOf("`;", start)).split("\n").forEach(l => {
    l = l.trim(); if (!l) return;
    if (l.startsWith("## ")) sub = l.slice(3);
    else if (l.startsWith("# ")) muscle = l.slice(2);
    else rows.push({ muscle, sub, name: l.split("|")[0].trim() });
  });
  return rows;
}
const words = n => n.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").map(w => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));

test("the library has no near-duplicate names", async () => {
  const rows = library(), seen = new Map(), clashes = [];
  for (const r of rows) {
    // Same words in any order or spacing count as the same exercise, except direction ("low-to-high" vs "high-to-low").
    const key = words(r.name).sort().join(" ") + (/high to low/.test(words(r.name).join(" ")) ? " |down" : "");
    const prev = seen.get(key);
    if (prev && prev !== r.name) clashes.push(`${prev} = ${r.name}`);
    seen.set(key, r.name);
  }
  expect(clashes).toEqual([]);
});

test("no exercise is listed twice under the same muscle group", async () => {
  const rows = library(), seen = new Set(), twice = [];
  for (const r of rows) { const k = `${r.muscle}|${r.name.toLowerCase()}`; if (seen.has(k)) twice.push(k); seen.add(k); }
  expect(twice).toEqual([]);
});

test("sets logged under a retired duplicate name load under the kept name", async ({ page }) => {
  const errors = await openApp(page, {
    entries: [set({ exercise: "High row machine", muscle: "Back", weight: 100, reps: 10 }), set({ exercise: "Reverse EZ-bar curl", muscle: "Biceps", weight: 50, reps: 12 })],
    settings: { bw: null, bwUnit: "lb", days: {}, bwLog: {}, exercises: { "high row machine": { muscle: "Back", also: ["Biceps"] } } },
  });
  const s = await page.evaluate(() => ({ e: JSON.parse(localStorage.getItem("liftlog.entries.v1")), st: JSON.parse(localStorage.getItem("liftlog.settings.v1")) }));
  expect(s.e.map(e => e.exercise)).toEqual(["High-row machine", "EZ-bar reverse curl"]);
  expect(Object.keys(s.st.exercises)).toEqual(["high-row machine"]);
  expect(errors).toEqual([]);
});

test("compound lifts list the other muscles they work", async ({ page }) => {
  const errors = await openApp(page);
  const alsoFor = async name => {
    await pickExercise(page, name);
    await page.click("#ex-chosen-text");
    const on = await page.locator('#exs-also [aria-pressed="true"]').allTextContents();
    await page.click("#exs-cancel"); await page.click("#ex-change");
    return on;
  };
  expect(await alsoFor("Barbell bench press — flat")).toEqual(["Shoulders", "Triceps"]);
  expect(await alsoFor("Lat pulldown — wide overhand")).toEqual(["Biceps"]);
  expect(await alsoFor("High-bar back squat")).toEqual(["Glutes"]);
  expect(await alsoFor("Romanian deadlift")).toEqual(["Glutes", "Lower back"]);
  expect(await alsoFor("Hammer curl")).toEqual(["Forearms"]);
  expect(await alsoFor("Leg extension machine")).toEqual([]);
  expect(errors).toEqual([]);
});
