// Lift Log: Achievement badges for an exercise's day (records, milestones, new / back) and for a whole day.
// ES module. Everything is worked out from logged entries; nothing is stored. See docs/DECISIONS.md.

import { KG_PER_LB } from "./ui.js";
import { bwKgOn, entries, prefs, rev } from "./state.js";
import { e1rm, esc, fmt, fmtBig, loadOf, toUnit, totalRaw, volOf } from "./log.js";
import { fmtMin, isCardio, paceText, suggestEquip, toMeters } from "./equipment.js";
import { srcFor } from "./parents.js";
import { STD, TIERS, ageFactor, matcher, profile, tierOf } from "./standards.js";
import { goalFor, goalText, reachedOn } from "./goals.js";

// A badge is {t: label, c: "" (green record) | "ms" (yellow milestone) | "nw" (blue new / back), why}.
// An exercise shows at most two: its top milestone, then its top record.
let memo = {};
// Each exercise's entries oldest first, and each training day's number and whether it was the biggest so far.
function index(){
  if(memo.list===entries && memo.n===entries.length && memo.rev===rev && memo.unit===prefs.unit) return memo;
  const byEx = new Map(), vol = new Map();
  entries.slice().sort((a,b)=> a.date===b.date ? (a.ts||0)-(b.ts||0) : a.date<b.date?-1:1).forEach(e=>{
    const k = e.exercise.toLowerCase(); if(!byEx.has(k)) byEx.set(k, []); byEx.get(k).push(e);
    vol.set(e.date, (vol.get(e.date)||0) + (isCardio(e) ? 0 : volOf(e)));
  });
  const days = new Map(); let top = 0, n = 0;
  vol.forEach((v, d)=>{ days.set(d, {n: ++n, biggest: top>0 && v>top}); top = Math.max(top, v); });
  return memo = {list:entries, n:entries.length, rev, unit:prefs.unit, byEx, days};
}
const daysBetween = (a, b) => Math.round((Date.parse(b+"T00:00:00Z") - Date.parse(a+"T00:00:00Z"))/864e5);
const unit = () => prefs.unit;
const kgOf = e => e.unit==="kg" ? totalRaw(e) : totalRaw(e)*KG_PER_LB;
const rankable = e => e.reps>0 && e.reps<=10;
const best1rm = list => list.filter(rankable).reduce((m,e)=>Math.max(m, e1rm(loadOf(e), e.reps)), 0);
const maxLoad = list => list.reduce((m,e)=>Math.max(m, loadOf(e)), 0);
const loadText = e => e.equip?.bw ? (loadOf(e)>0 ? `BW + ${fmt(loadOf(e))} ${unit()}` : "body weight") : `${fmt(loadOf(e))} ${unit()}`;

// Plates a side on a barbell: a 45 lb bar plus pairs of 45s (20 kg and 20s in kg). Not the EZ bar.
const barbellish = e => { const eq = e.equip && Object.keys(e.equip).length ? e.equip : suggestEquip(srcFor(e.exercise, e.variant)); return !!eq.barbell && eq.barbell.type!=="EZ bar"; };
const plateStep = () => unit()==="kg" ? [20, 20] : [45, 45];
const platesAt = load => { const [bar, p] = plateStep(); return Math.max(0, Math.floor((load - bar + 0.01)/(2*p))); };
const plateLoad = n => { const [bar, p] = plateStep(); return bar + 2*p*n; };

// Strength-standard tier these sets reach (null when there's nothing to judge, e.g. no body weight).
function tierOfSets(def, list, std){
  let v = 0, known = false;
  list.forEach(e=>{
    if(def.reps){ if(e.reps>=1){ v = Math.max(v, e.reps); known = true; } return; }
    const bw = bwKgOn(e.date); if(!(e.weight>0) || !rankable(e) || !bw) return;
    v = Math.max(v, e1rm(kgOf(e), e.reps)/bw); known = true;
  });
  return known ? tierOf(v*ageFactor(), def[std]) : null;
}
// Best est. 1RM ÷ that day's body weight (null without body weight).
function bwRatio(list){
  let r = null;
  list.forEach(e=>{ const bw = bwKgOn(e.date); if(e.weight>0 && rankable(e) && bw) r = Math.max(r||0, e1rm(kgOf(e), e.reps)/bw); });
  return r;
}

function liftBadges(g, prev){
  if(!prev.length) return [{t:"New", c:"nw", why:"First time logged"}];
  const u = unit(), day = g[0].date, rec = [], ms = [];
  const now1 = best1rm(g), was1 = best1rm(prev), nowL = maxLoad(g), wasL = maxLoad(prev);
  if(now1>0 && was1>0 && now1>was1) rec.push({t:"PR", c:"", why:`PR: est. 1RM ${Math.round(now1)} ${u}, up from ${Math.round(was1)} ${u}`, e1rm:true});
  if(wasL>0 && nowL>wasL) rec.push({t:"Heaviest", c:"", why:`Heaviest: ${fmt(nowL)} ${u}, up from ${fmt(wasL)} ${u}`});
  // Rep PR: more reps than any earlier set at this weight or heavier (the heaviest such set wins).
  let rp = null;
  g.forEach(s=>{
    const L = loadOf(s), was = prev.reduce((m,p)=> loadOf(p)>=L-0.01 ? Math.max(m, p.reps) : m, 0);
    if(was>0 && s.reps>was && (!rp || L>loadOf(rp.s))) rp = {s, was};
  });
  if(rp) rec.push({t:"Rep PR", c:"", why:`Rep PR: ${rp.s.reps} reps at ${loadText(rp.s)}, up from ${rp.was}`});
  const byDay = new Map(); prev.forEach(e=>byDay.set(e.date, (byDay.get(e.date)||0) + volOf(e)));
  const nowV = g.reduce((s,e)=>s+volOf(e), 0), wasV = Math.max(0, ...byDay.values());
  if(wasV>0 && nowV>wasV) rec.push({t:"Volume PR", c:"", why:`Volume PR: ${fmtBig(nowV)} ${u}, up from ${fmtBig(wasV)} ${u}`});

  const def = STD.find(d=>matcher(d)(g[0])), std = profile().std;
  if(def && (std==="men" || std==="women")){
    const a = tierOfSets(def, prev, std), b = tierOfSets(def, g, std);
    if(a!=null && b!=null && b>a) ms.push({t:"Tier up", c:"ms", why:`Tier up: ${TIERS[a]} → ${TIERS[b]} (app's estimate)`});
  }
  if(barbellish(g[0])){
    const a = platesAt(wasL), b = platesAt(nowL), t = `${b} plate${b>1?"s":""}`;
    if(b>=1 && b>a) ms.push({t, c:"ms", why:`${t}: first time at ${fmt(plateLoad(b))} ${u}`});
  }
  if(def && !def.reps){
    const a = bwRatio(prev), b = bwRatio(g), k = a!=null && b!=null && [3, 2.5, 2, 1.5, 1].find(k=>b>=k && a<k);
    if(k) ms.push({t:`${k}× BW`, c:"ms", why:`${k}× body weight: est. 1RM ${Math.round(now1)} ${u} at ${fmt(toUnit(bwKgOn(day), "kg"))} ${u} body weight`});
  }
  const gap = daysBetween(prev[prev.length-1].date, day);
  if(gap>=30) ms.push({t:"Back", c:"nw", why:`Back: first time in ${gap} days`});
  return [ms[0], rec[0]].filter(Boolean);
}
// The day a lift goal was first met: a milestone that comes before the others.
function withGoal(g, list){
  const gl = goalFor(g[0].exercise);
  if(!gl || reachedOn(gl)!==g[0].date) return list;
  return [{t:"Goal", c:"ms", why:`Goal reached: ${goalText(gl)}`}, ...list.filter(b=>b.c!=="ms")].slice(0, 2);
}

const meters = e => e.distance>0 ? toMeters(e.distance, e.distUnit) : 0;
const speed = e => meters(e)>0 && e.minutes>0 ? meters(e)/e.minutes : 0;
function cardioBadges(g, prev){
  if(!prev.length) return [{t:"New", c:"nw", why:"First time logged"}];
  const rec = [], ms = [];
  const far = g.reduce((m,e)=>meters(e)>meters(m) ? e : m), wasM = Math.max(0, ...prev.map(meters));
  if(meters(far)>0 && wasM>0){
    if(meters(far)>wasM+0.5) rec.push({t:"Longest", c:"", why:`Longest: ${fmt(far.distance)} ${far.distUnit}, up from ${fmt(wasM/toMeters(1, far.distUnit))} ${far.distUnit}`});
  } else {
    const now = Math.max(0, ...g.map(e=>e.minutes||0)), was = Math.max(0, ...prev.map(e=>e.minutes||0));
    if(was>0 && now>was) rec.push({t:"Longest", c:"", why:`Longest: ${fmtMin(now)}, up from ${fmtMin(was)}`});
  }
  // Fastest: a quicker pace than every earlier session at least 90% as long.
  const fast = g.filter(speed).reduce((m,e)=>!m || speed(e)>speed(m) ? e : m, null);
  if(fast){
    const like = prev.filter(p=>speed(p) && meters(p)>=0.9*meters(fast));
    if(like.length && speed(fast)>Math.max(...like.map(speed))) rec.push({t:"Fastest", c:"", why:`Fastest: ${paceText(fast) || `${fmt(fast.distance)} ${fast.distUnit} in ${fmtMin(fast.minutes)}`}, your quickest at this distance`});
  }
  const gap = daysBetween(prev[prev.length-1].date, g[0].date);
  if(gap>=30) ms.push({t:"Back", c:"nw", why:`Back: first time in ${gap} days`});
  return [ms[0], rec[0]].filter(Boolean);
}

// Badges for one exercise's sets on one day.
function exBadges(g){
  const day = g[0].date, prev = (index().byEx.get(g[0].exercise.toLowerCase()) || []).filter(e=>e.date<day);
  return isCardio(g[0]) ? cardioBadges(g, prev) : withGoal(g, liftBadges(g, prev));
}
const ordinal = n => n + (n%100>=11 && n%100<=13 ? "th" : ({1:"st", 2:"nd", 3:"rd"}[n%10] || "th"));
// Badges for a whole day: most volume ever, and the 10th, 25th, 50th, 100th, 150th… training day.
function dayBadges(d){
  const x = index().days.get(d), out = []; if(!x) return out;
  if(x.biggest) out.push({t:"Biggest day", c:""});
  if(x.n===10 || x.n===25 || x.n%50===0) out.push({t:`${ordinal(x.n)} workout`, c:"ms"});
  return out;
}
const badgeHTML = list => list.map(b=>` <span class="pr${b.c ? " "+b.c : ""}">${esc(b.t)}</span>`).join("");
// "Label: reason" pieces for History's line under the bars, label in bold.
const whyHTML = list => list.map(b=>{ const i = b.why.indexOf(":"); return i>0 ? `<b>${esc(b.why.slice(0, i+1))}</b>${esc(b.why.slice(i+1))}` : esc(b.why); });
// Streak weeks worth a badge on Progress.
const streakMilestone = w => w===4 || w===8 || w===12 || w===26 || (w>0 && w%52===0);

export { exBadges, dayBadges, badgeHTML, whyHTML, streakMilestone };
