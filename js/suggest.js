// Lift Log: "Last" line and the next-set suggestion on the Log form.
// ES module, no start-up code.

import { $ } from "./ui.js";
import { entries, prefs, rev } from "./state.js";
import { e1rm, esc, fmt, niceDate, rirText, roundStep, stepSize, toUnit, today } from "./log.js";
import { equipText, isCardio, isCardioForm } from "./equipment.js";
import { variantKey, variantLabel } from "./parents.js";
import { currentVariant } from "./variant-ui.js";
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

// ---------- your PR, and the smallest set that would beat it ----------
// The PR is the best est. 1RM from sets of 10 reps or fewer, as entered (the weight box's numbers). It comes from the
// chosen variant's sets when you've logged that variant (a machine's numbers don't compare with a cable's), else from
// every variant. Bodyweight sets have no PR here.
function prSets(name, date){
  // Sets logged on the day itself count too, so a PR you set earlier today is the one to beat.
  const all = straight(name, e => e.reps > 0 && e.reps <= 10 && e.weight > 0 && !isBW(e) && (!date || e.date <= date));
  const k = variantKey(currentVariant()), mine = all.filter(e => variantKey(e.variant) === k);
  return mine.length ? mine : all;
}
function bestPR(name, date){
  let best = null;
  prSets(name, date).sort((a, b) => a.date === b.date ? byTs(a, b) : a.date < b.date ? -1 : 1).forEach(e => {
    const w = toUnit(e.weight, e.unit), x = e1rm(w, e.reps);
    if(!best || x > best.e1 + 0.01) best = { w, r: e.reps, e1: x, date: e.date };
  });
  return best;
}
// The smallest step over your PR: more weight at these reps, or one more rep at last time's top weight. Only within 3%
// of the PR, so it's a real attempt and not a jump.
function prTry(name, reps, lastTop, date){
  const pr = bestPR(name, date); if(!pr) return null;
  const step = stepSize(), cands = [];
  if(reps >= 1 && reps <= 10){
    let w = Math.ceil((pr.e1 / (reps <= 1 ? 1 : 1 + reps / 30)) / step) * step;
    if(e1rm(w, reps) <= pr.e1 + 0.01) w += step;
    cands.push({ weight: w, reps });
  }
  if(lastTop > 0){
    const most = prSets(name, date).filter(e => toUnit(e.weight, e.unit) >= lastTop - 0.01).reduce((m, e) => Math.max(m, e.reps), 0);
    if(most > 0 && most < 10) cands.push({ weight: lastTop, reps: most + 1 });
  }
  return cands.map(c => ({ ...c, e1: e1rm(c.weight, c.reps) })).filter(c => c.e1 > pr.e1 + 0.01 && c.e1 <= pr.e1 * 1.03).sort((a, b) => a.e1 - b.e1)[0] || null;
}
const shortDate = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.slice(0, 4) === today().slice(0, 4) ? undefined : "numeric" });
// Adds your PR to a suggestion: a PR tag when the suggestion beats it; else, on a day to push, a set that would.
function withPR(s, name, date){
  const pr = bestPR(name, date); if(!pr) return s;
  const was = `Your PR is ${fmt(pr.w)} × ${pr.r} (${shortDate(pr.date)})`;
  if(e1rm(s.weight, s.reps) > pr.e1 + 0.01) return { ...s, isPR: true, prText: `${was}, so this beats it.` };
  const t = s.hold ? null : prTry(name, s.reps, s.top, date);
  return { ...s, prText: t ? `${was}; ${fmt(t.weight)} × ${t.reps} would beat it.` : `${was}.` };
}

// Next set for an exercise on a date: {weight, reps, title, why, isPR, prText}, or null when there isn't enough to go on.
function nextSet(name, date){
  const s = baseNext(name, date);
  return s ? withPR(s, name, date) : null;
}
function baseNext(name, date){
  if(!name) return null;
  // The chosen variant's sessions when you've done it (dumbbell and barbell numbers don't mix), else every variant's.
  // One past session is enough to suggest from.
  const every = straight(name, e => e.date < date), k = variantKey(currentVariant()), mine = every.filter(e => variantKey(e.variant) === k);
  const hist = mine.length ? mine : every;
  const dates = [...new Set(hist.map(e => e.date))].sort();
  if(!dates.length) return null;
  const last = hist.filter(e => e.date === dates[dates.length - 1]).sort(byTs).map(e => ({ w: toUnit(e.weight, e.unit), r: e.reps, bw: isBW(e) }));
  const top = Math.max(...last.map(x => x.w)), atTop = last.filter(x => Math.abs(x.w - top) < 0.01);
  if(atTop[0].bw && top === 0) return null;   // plain bodyweight: nothing to add
  const mk = (weight, reps, why, hold = false) => ({ weight, reps, why, hold, top, title: `${weight > top + 0.01 || reps !== atTop[0].r || weight < top - 0.01 ? "Try" : "Stay at"} ${fmt(weight)} × ${reps}` });

  // Planned for this day: the plan's range and progression decide.
  const w = workoutById(workoutFor(date)), it = w && w.items.find(x => x.exercise.toLowerCase() === name.toLowerCase() && !x.minutes);
  if(it){
    const s = suggestFor(it, date);
    if(!(s.weight > 0)) return null;
    return { ...mk(s.weight, s.reps, ""), why: `Plan: ${s.sets} × ${s.lo === s.hi ? s.lo : `${s.lo}–${s.hi}`}. ${s.why}.` };
  }

  const gap = days(dates[dates.length - 1], date);
  if(gap > 28) return mk(roundStep(top * 0.9), atTop[0].r, `Back after ${Math.floor(gap / 7)} weeks: start a little lighter.`, true);
  const target = atTop[0].r, missed = atTop.filter(x => x.r < target).length;
  if(missed) return mk(top, target, `Last time: ${atTop.map(x => x.r).join(", ")}. Get all ${target}, then add weight.`, true);
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

export { renderLastTime, toggleLastTime, lastSession, lastText, nextSet, bestPR, prTry };
