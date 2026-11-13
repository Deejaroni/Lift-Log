// Lift Log: "Last" line and the next-set suggestion on the Log form.
// ES module, no start-up code.

import { $ } from "./ui.js";
import { entries, prefs, rev } from "./state.js";
import { e1rm, esc, fmt, niceDate, rirText, roundStep, toUnit, today } from "./log.js";
import { equipText, isCardio, isCardioForm } from "./equipment.js";
import { variantLabel } from "./parents.js";
import { groupOf } from "./catalog.js";
import { LOWER, suggestFor, workoutById, workoutFor } from "./plan.js";

const straight = (name, pred) => { const l = name.toLowerCase(); return entries.filter(e => !isCardio(e) && !e.chain && e.exercise.toLowerCase() === l && pred(e)); };
const byTs = (a, b) => (a.ts || 0) - (b.ts || 0);
const isBW = e => !!(e.equip && e.equip.bw);
const wText = (e, w) => isBW(e) ? (w > 0 ? `BW + ${fmt(w)}` : "BW") : fmt(w);

// The sets of the last session before `date` (or, with none, the ones already logged on `date`).
function lastSession(name, date){
  const before = straight(name, e => e.date < date);
  const d = before.reduce((m, e) => e.date > m ? e.date : m, "");
  return d ? before.filter(e => e.date === d).sort(byTs) : straight(name, e => e.date === date).sort(byTs);
}

// "Last 135 × 8, 8, 7 · 155 × 3": runs of the same weight, in the order they were done.
function lastText(name, date){
  const s = name ? lastSession(name, date) : [];
  if(!s.length) return "";
  const runs = [];
  s.forEach(e => {
    const w = toUnit(e.weight, e.unit), r = runs[runs.length - 1];
    if(r && Math.abs(r.w - w) < 0.01 && r.bw === isBW(e)) r.reps.push(e.reps); else runs.push({ w, bw: isBW(e), e, reps: [e.reps] });
  });
  return "Last " + runs.map(r => `${wText(r.e, r.w)} × ${r.reps.join(", ")}`).join(" · ");
}

const DAY = 864e5, days = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / DAY);

// Next set for an exercise on a date: {weight, reps, title, why}, or null when there isn't enough to go on.
function nextSet(name, date){
  if(!name) return null;
  const hist = straight(name, e => e.date < date);
  const dates = [...new Set(hist.map(e => e.date))].sort();
  if(dates.length < 2) return null;
  const last = hist.filter(e => e.date === dates[dates.length - 1]).sort(byTs).map(e => ({ w: toUnit(e.weight, e.unit), r: e.reps, bw: isBW(e) }));
  const top = Math.max(...last.map(x => x.w)), atTop = last.filter(x => Math.abs(x.w - top) < 0.01);
  if(atTop[0].bw && top === 0) return null;   // plain bodyweight: nothing to add
  const mk = (weight, reps, why) => ({ weight, reps, why, title: `${weight > top + 0.01 || reps !== atTop[0].r || weight < top - 0.01 ? "Try" : "Stay at"} ${fmt(weight)} × ${reps}` });

  // Planned for this day: the plan's range and progression decide.
  const w = workoutById(workoutFor(date)), it = w && w.items.find(x => x.exercise.toLowerCase() === name.toLowerCase() && !x.minutes);
  if(it){
    const s = suggestFor(it, date);
    if(!(s.weight > 0)) return null;
    return { ...mk(s.weight, s.reps, ""), why: `Plan: ${s.sets} × ${s.lo === s.hi ? s.lo : `${s.lo}–${s.hi}`}. ${s.why}.` };
  }

  const gap = days(dates[dates.length - 1], date);
  if(gap > 28) return mk(roundStep(top * 0.9), atTop[0].r, `Back after ${Math.floor(gap / 7)} weeks: start a little lighter.`);
  const target = atTop[0].r, missed = atTop.filter(x => x.r < target).length;
  if(missed) return mk(top, target, `Last time: ${atTop.map(x => x.r).join(", ")}. Get all ${target}, then add weight.`);
  const kg = prefs.unit === "kg", lower = LOWER.has(groupOf(name));
  const inc = lower ? (kg ? 5 : 10) : (kg ? 2.5 : 5);
  return mk(top + inc, target, atTop.length > 1 ? `You got all ${target} reps on every set last time.` : `You got ${target} reps last time.`);
}

// ---------- Last time: the previous session of the chosen exercise, folded to one line ----------
let ltOpen = false, ltKey = "";
const ago = n => n===1 ? "yesterday" : n<14 ? `${n} days ago` : `${Math.round(n/7)} weeks ago`;
function renderLastTime(){
  const box = $("#last-time"), name = $("#exercise").value.trim(), date = $("#date").value || today(), l = name.toLowerCase();
  const before = name && !isCardioForm() ? entries.filter(e=>!isCardio(e) && e.exercise.toLowerCase()===l && e.date<date) : [];
  const d = before.reduce((m, e) => e.date > m ? e.date : m, "");
  box.hidden = !d; if(!d){ ltKey = ""; return; }
  const key = [l, d, date, rev, ltOpen, prefs.unit].join("|"); if(key===ltKey) return; ltKey = key;
  const s = before.filter(e=>e.date===d).sort(byTs), w = e => toUnit(e.weight, e.unit);
  const ranked = s.filter(e=>e.reps>0 && e.reps<=10), score = e => ranked.length ? e1rm(w(e), e.reps) : w(e);
  const best = (ranked.length ? ranked : s).reduce((b, e)=> !b || score(e)>score(b) ? e : b, null);
  $("#lt-sum").setAttribute("aria-expanded", String(ltOpen));
  $("#lt-when").textContent = ltOpen ? `${niceDate(d)} · ${ago(days(d, date))}` : `${niceDate(d)} · best ${wText(best, w(best))} × ${best.reps}`;
  $("#lt-body").hidden = !ltOpen; if(!ltOpen) return;
  const rows = [], seen = new Set();
  s.forEach(e=>{
    if(e.chain){ if(seen.has(e.chain)) return; seen.add(e.chain);
      const steps = s.filter(x=>x.chain===e.chain).sort((a,b)=>a.step-b.step);
      rows.push(`<div class="lt-row"><span>Drop set: ${steps.map(x=>`${wText(x, w(x))} × ${x.reps}`).join(" → ")}</span></div>`); return; }
    const det = [e.failure ? "To failure" : "", rirText(e.rir)].filter(Boolean).join(" · ");
    rows.push(`<button type="button" class="lt-row" data-lt-w="${fmt(w(e))}" data-lt-r="${e.reps}" aria-label="Use ${fmt(w(e))} ${prefs.unit} × ${e.reps}"><span class="num">${wText(e, w(e))}<span class="x"> ${prefs.unit} × </span>${e.reps}</span>${det ? `<small>${esc(det)}</small>` : ""}</button>`);
  });
  const notes = [...new Set(s.map(e=>e.note).filter(Boolean))].map(n=>`“${n}”`), eq = [variantLabel(s[0].variant), equipText(s[0])].filter(Boolean).join(" · ");
  const foot = [eq, ...notes].filter(Boolean).join(" · ");
  $("#lt-body").innerHTML = rows.join("") + (foot ? `<p class="lt-note">${esc(foot)}</p>` : "");
}
function toggleLastTime(){ ltOpen = !ltOpen; renderLastTime(); }

export { renderLastTime, toggleLastTime, lastSession, lastText, nextSet };
