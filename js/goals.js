// Lift Log: lift goals ("Bench press 225 lb × 1 by Jun 1"): the goal box on Progress, the goal sheet, and the
// checks badges use to mark the day a goal was reached. ES module; js/app.js calls init() in its fixed order.
// A goal is stored in settings.goals under the exercise's lowercase name: {exercise, weight, reps, unit, by, set}.
import { $, dialog } from "./ui.js";
import { entries, prefs, saveSettings, settings } from "./state.js";
import { e1rm, esc, fmt, loadOf, niceDate, toUnit, today } from "./log.js";

const key = n => (n || "").toLowerCase();
const goalFor = name => (settings.goals || {})[key(name)] || null;
const goalLoad = g => toUnit(g.weight, g.unit);          // in the display unit
const goalE1 = g => e1rm(goalLoad(g), g.reps);
const goalText = g => `${fmt(goalLoad(g))} ${prefs.unit} × ${g.reps}`;
const isLift = e => e.kind !== "cardio" && e.kind !== "mobility" && e.reps > 0;
const liftsOf = name => entries.filter(e => key(e.exercise) === key(name) && isLift(e));
// Best est. 1RM (sets of 10 reps or fewer, like everywhere else), in the display unit.
const bestE1 = name => liftsOf(name).reduce((m, e) => e.reps <= 10 ? Math.max(m, e1rm(loadOf(e), e.reps)) : m, 0);
// A set meets the goal when it's at least the goal's weight for at least its reps.
const meets = (e, g) => isLift(e) && loadOf(e) >= goalLoad(g) - 0.01 && e.reps >= g.reps;
// The first day, on or after the goal was set, with a set that met it (or null).
function reachedOn(g){
  if(!g) return null;
  return liftsOf(g.exercise).filter(e => e.date >= g.set && meets(e, g)).map(e => e.date).sort()[0] || null;
}
const DAY = 864e5, dnum = iso => Date.parse(iso + "T00:00:00Z") / DAY, iso = n => new Date(n * DAY).toISOString().slice(0, 10);
// When you'd reach the goal's est. 1RM at your pace: a straight-line fit of each day's best est. 1RM over the last
// 8 weeks. Needs 3 days over at least 2 weeks, and a rising trend; else null.
function projected(g){
  const from = dnum(today()) - 56, byDay = new Map();
  liftsOf(g.exercise).forEach(e => { if(e.reps > 10 || dnum(e.date) < from) return; byDay.set(e.date, Math.max(byDay.get(e.date) || 0, e1rm(loadOf(e), e.reps))); });
  const pts = [...byDay].map(([d, v]) => [dnum(d), v]);
  if(pts.length < 3) return null;
  const xs = pts.map(p => p[0]), span = Math.max(...xs) - Math.min(...xs); if(span < 14) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const slope = pts.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / pts.reduce((a, [x]) => a + (x - mx) ** 2, 0);
  if(!(slope > 0)) return null;
  const now = dnum(today()), at = my + slope * (now - mx), days = Math.max(0, (goalE1(g) - at) / slope);
  return iso(Math.round(now + days));
}
const shortDate = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, {month: "short", day: "numeric", year: d.slice(0, 4) === today().slice(0, 4) ? undefined : "numeric"});

// The goal box on an exercise's progress card, or a "Set a goal" button.
function goalHTML(name){
  const g = goalFor(name);
  if(!g) return `<button type="button" class="secondary goal-set" id="goal-set">Set a goal</button>`;
  const best = bestE1(name), target = goalE1(g), hit = reachedOn(g), pct = hit ? 100 : Math.min(100, Math.round(best / target * 100));
  let line;
  if(hit) line = `Reached ${niceDate(hit)}`;
  else {
    const p = projected(g);
    line = `Best est. 1RM ${fmt(Math.round(best))} ${prefs.unit} of ${fmt(Math.round(target))}` + (
      g.by && g.by < today() ? " · your date has passed" :
      !p ? " · a few more sessions to see your pace" :
      !g.by || p <= g.by ? ` · on track for about ${shortDate(p)}` : ` · at this pace, about ${shortDate(p)}`);
  }
  return `<button type="button" class="bd-goal${hit ? " hit" : ""}" id="goal-edit" aria-label="Goal: ${esc(goalText(g))}. Tap to change">
    <span class="bd-goal-t"><span>Goal: ${esc(goalText(g))}</span>${g.by ? `<small>by ${esc(niceDate(g.by))}</small>` : ""}</span>
    <span class="bd-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
    <small>${esc(line)}</small></button>`;
}

// ---------- the goal sheet ----------
let sheetFor = "", sheetBack = null;
const val = id => parseFloat($(id).value);
function hint(){
  const w = val("#g-weight"), r = parseInt($("#g-reps").value, 10), best = bestE1(sheetFor);
  if(!(w > 0) || !(r >= 1) || !(best > 0)){ $("#g-hint").textContent = ""; return; }
  const pct = Math.round((e1rm(w, r) / best - 1) * 100);
  $("#g-hint").textContent = pct > 0 ? `About ${pct}% above your best est. 1RM now.` : "That's at or below your best est. 1RM already.";
}
function openGoal(name){
  sheetFor = name; sheetBack = document.activeElement;
  const g = goalFor(name), later = new Date(today() + "T00:00:00Z"); later.setUTCMonth(later.getUTCMonth() + 3);
  $("#goal-title").textContent = `Goal for ${name}`;
  $("#g-unit").textContent = prefs.unit;
  $("#g-weight").value = g ? fmt(goalLoad(g)) : ""; $("#g-reps").value = g ? g.reps : "1";
  $("#g-by").value = g ? g.by || "" : later.toISOString().slice(0, 10);
  $("#goal-remove").hidden = !g;
  hint();
  $("#goal-sheet").hidden = false; $("#g-weight").focus();
}
function closeGoal(){ $("#goal-sheet").hidden = true; if(sheetBack && sheetBack.isConnected) sheetBack.focus(); else $("#prog-ex").focus({preventScroll: true}); }
async function saveGoal(){
  const w = val("#g-weight"), r = parseInt($("#g-reps").value, 10), by = $("#g-by").value;
  if(!(w > 0) || !(r >= 1 && r <= 30)){ $("#g-hint").textContent = "Enter a weight and 1 to 30 reps."; return; }
  if(by && by <= today()){ $("#g-hint").textContent = "Pick a date after today, or leave it empty."; return; }
  const old = goalFor(sheetFor);
  settings.goals[key(sheetFor)] = {exercise: sheetFor, weight: w, reps: r, unit: prefs.unit, by: by || null,
    // A changed target counts from today; just moving the date keeps when it was set.
    set: old && old.weight === w && old.reps === r && old.unit === prefs.unit ? old.set : today()};
  $("#goal-sheet").hidden = true; await saveSettings(); closeGoal();
}
async function removeGoal(){
  $("#goal-sheet").hidden = true;
  if(!(await dialog({message: `Remove your goal for ${sheetFor}?`, ok: "Remove", danger: true}))){ $("#goal-sheet").hidden = false; return; }
  delete settings.goals[key(sheetFor)]; await saveSettings(); closeGoal();
}

export function init(){
  $("#goal-save").addEventListener("click", saveGoal);
  $("#goal-cancel").addEventListener("click", closeGoal);
  $("#goal-remove").addEventListener("click", removeGoal);
  ["#g-weight", "#g-reps"].forEach(s => $(s).addEventListener("input", hint));
  $("#goal-sheet").addEventListener("click", e => { if(e.target === $("#goal-sheet")) closeGoal(); });
  $("#goal-sheet").addEventListener("keydown", e => { if(e.key === "Escape"){ e.preventDefault(); closeGoal(); } });
  $("#prog-goal").addEventListener("click", e => { if(e.target.closest("#goal-set, #goal-edit")) openGoal($("#prog-ex").value); });
}

export { goalFor, goalText, goalHTML, reachedOn, meets, projected, openGoal };
