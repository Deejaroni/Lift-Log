// Lift Log: the summary shown when you tap Finish workout under today's list.
// ES module. Its start-up code runs in init(), which js/app.js calls in a fixed order (see docs/DECISIONS.md).
// Nothing is saved: it's worked out from the day's sets each time it opens.

import { $ } from "./ui.js";
import { entries, prefs, settings } from "./state.js";
import { esc, niceDate, today, volOf } from "./log.js";
import { isCardio } from "./equipment.js";
import { dayBadges, exBadges } from "./badges.js";
import { workoutById, workoutFor } from "./plan.js";
import { isoOf } from "./progress.js";

const strengthOn = date => entries.filter(e=>e.date===date && !isCardio(e));
const dayVol = list => list.reduce((s,e)=>s+volOf(e), 0);
const namesOf = list => new Set(list.map(e=>e.exercise.toLowerCase()));

// The planned workout, if today's sets include at least one of its exercises.
function plannedOn(date, names){
  const w = workoutById(workoutFor(date));
  return w && (w.items||[]).some(it=>names.has((it.exercise||"").toLowerCase())) ? w : null;
}
// The day to compare with: the last time this planned workout was done, else the last day that shared
// at least half of today's exercises.
function lastLike(date, names, w){
  const done = (settings.program && settings.program.done) || {};
  if(w){
    const d = Object.keys(done).filter(d=>d<date && done[d]===w.id && strengthOn(d).length).sort().pop();
    if(d) return d;
  }
  const days = [...new Set(entries.filter(e=>e.date<date && !isCardio(e)).map(e=>e.date))].sort().reverse();
  return days.find(d=>{ const n = namesOf(strengthOn(d)); return [...names].filter(x=>n.has(x)).length*2 >= names.size; }) || null;
}

const clock = t => new Date(t).toLocaleTimeString("en-US", {hour:"numeric", minute:"2-digit"}).toLowerCase();
function timeSpan(date, list){
  const ts = list.map(e=>e.ts).filter(t=>typeof t==="number" && t>1e12 && isoOf(new Date(t))===date);
  if(ts.length<2) return null;
  const a = Math.min(...ts), b = Math.max(...ts), mins = Math.round((b-a)/60000);
  if(mins<1) return null;
  const [ca, cb] = [clock(a), clock(b)], same = ca.slice(-2)===cb.slice(-2);
  return {dur: `${Math.floor(mins/60)}:${String(mins%60).padStart(2,"0")}`, range: `${same ? ca.slice(0,-3) : ca}–${cb}`};
}

// Records and milestones from today's badges (not "New" or "Back"), plus Biggest day.
function wins(date, list){
  const groups = new Map();
  list.forEach(e=>{ const k = e.exercise.toLowerCase(); if(!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
  const out = [];
  groups.forEach(g=>exBadges(g).filter(b=>b.c!=="nw").forEach(b=>{
    const i = b.why.indexOf(":");
    out.push({t:b.t, c:b.c, text:`${g[0].exercise}: ${i>0 ? b.why.slice(i+1).trim() : b.why}`});
  }));
  if(dayBadges(date).some(b=>b.t==="Biggest day")) out.push({t:"Biggest day", c:"", text:"Your most volume in one day"});
  return out;
}

function summaryHTML(date){
  const list = strengthOn(date), names = namesOf(list), w = plannedOn(date, names);
  const vs = lastLike(date, names, w), now = dayVol(list), was = vs ? dayVol(strengthOn(vs)) : 0;
  const pct = was>0 ? Math.round((now/was-1)*100) : null;
  const change = pct==null ? "" : pct===0 ? ", same as last time" : `, ${pct>0?"+":"−"}${Math.abs(pct)}%`;
  const span = timeSpan(date, list), won = wins(date, list);
  $("#sum-title").textContent = w ? `${w.name} · done` : "Workout done";
  return `<p class="sum-when">${esc(niceDate(date))}${span ? ` · ${span.range}` : ""}</p>
    <div class="stats">
      <div class="stat"><div class="num">${span ? span.dur : "—"}</div><small>Time</small></div>
      <div class="stat"><div class="num">${list.length.toLocaleString()}</div><small>Sets</small></div>
      <div class="stat"><div class="num">${Math.round(now).toLocaleString()}</div><small>${prefs.unit} lifted${change}</small></div></div>
    ${vs ? `<p class="sum-vs">Compared with ${esc(niceDate(vs))}</p>` : ""}
    ${won.length ? `<ul class="sum-prs">${won.map(b=>`<li><span class="pr${b.c ? " "+b.c : ""}">${esc(b.t)}</span> ${esc(b.text)}</li>`).join("")}</ul>`
      : `<p class="sum-none">No new records this time.</p>`}`;
}

function openSummary(){
  $("#sum-body").innerHTML = summaryHTML($("#date").value || today());
  $("#sum-sheet").hidden = false; $("#sum-done").focus();
}
function closeSummary(){
  $("#sum-sheet").hidden = true;
  const b = $("#finish-workout"); if(b) b.focus({preventScroll: true});
}

// The button that goes under today's list (only today, once a strength set is logged).
const finishHTML = date => date===today() && strengthOn(date).length ? `<button type="button" class="secondary finish-btn" id="finish-workout">Finish workout</button>` : "";

export function init(){
  $("#day-list").addEventListener("click", e => { if(e.target.closest("#finish-workout")) openSummary(); });
  $("#sum-done").onclick = closeSummary;
  $("#sum-sheet").addEventListener("click", e => { if(e.target === $("#sum-sheet")) closeSummary(); });
  $("#sum-sheet").addEventListener("keydown", e => { if(e.key === "Escape"){ e.preventDefault(); closeSummary(); } });
}

export { finishHTML, openSummary };
