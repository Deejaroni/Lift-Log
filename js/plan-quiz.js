// Lift Log: "Build your own" on the Plan tab: six questions, then a weekly program made from the answers.
// ES module. The Plan tab's editor (js/plan-editor.js) shows the quiz and opens the result. See docs/DECISIONS.md.

import { prefs } from "./state.js";
import { esc } from "./log.js";
import { DOW, blankProgram, pid } from "./plan.js";

const GOALS = [["muscle","Build muscle","Bigger, more defined muscles"], ["strength","Get stronger","Lift more on squat, bench and deadlift"],
  ["fat","Lose fat","Keep muscle while you lose weight, with some cardio"], ["fit","Stay fit and healthy","A balanced routine that's easy to keep up"]];
const WHERE = [["gym","Full gym","Machines, cables, barbells and dumbbells"], ["db","Home: dumbbells","Dumbbells and a bench"],
  ["bw","Home: body weight","No equipment. A pull-up bar helps if you have one"]];
const EXPS = [["new","New to it","Less than 6 months. More machines, fewer sets"], ["some","Some experience","6 months to 2 years"], ["exp","Experienced","2+ years. More free weights and volume"]];
const MINS = [30, 45, 60, 75];
const FOCUS = [["arms","Arms"], ["shoulders","Shoulders"], ["chest","Chest"], ["back","Back"], ["glutes","Glutes"], ["legs","Legs"], ["core","Core"]];
const perWorkout = mins => ({30:4, 45:5, 60:6, 75:7})[mins] || 6;
const minsText = m => m>=75 ? "75+ min" : `${m} min`;
const label = (list, k) => (list.find(x=>x[0]===k) || [])[1] || "";

// ---------- building the plan ----------
// Each slot: [new to lifting, some experience, experienced (if different)]. "Get stronger" swaps in the barbell lifts at a gym.
// At home, a slot with no fitting exercise is "" and the workout fills up from FILL instead.
const GYM = {
  squat:["Leg press","High-bar back squat"], hinge:["Romanian deadlift","Romanian deadlift"], legs2:["Hack squat","Bulgarian split squat"],
  hamCurl:["Seated leg curl","Lying leg curl"], quadIso:["Leg extension machine","Leg extension machine"], calf:["Standing calf raise","Seated calf raise"],
  glute:["Hip thrust machine","Barbell hip thrust"], abduct:["Seated hip abduction machine","Seated hip abduction machine"],
  hpush:["Seated chest press","Barbell bench press — flat"], ipush:["Dumbbell bench press — low incline","Dumbbell bench press — low incline"],
  fly:["Cable fly — mid pulley","Cable fly — mid pulley"], vpush:["Machine shoulder press","Seated dumbbell shoulder press"],
  vpull:["Lat pulldown — medium overhand","Lat pulldown — medium overhand","Pull-up"], vpull2:["Lat pulldown — neutral grip","Lat pulldown — neutral grip"],
  hrow:["Seated cable row","Seated cable row","Barbell bent-over row"], hrow2:["Chest-supported row machine","Chest-supported dumbbell row"],
  back2:["Straight-arm pulldown","Straight-arm pulldown"], lateral:["Dumbbell lateral raise — standing","Single-arm cable lateral raise"],
  rear:["Reverse pec deck","Face pull"], bicep:["Preacher curl machine","EZ-bar curl"], bicep2:["Hammer curl","Incline dumbbell curl"],
  tricep:["Rope pushdown","Rope pushdown"], tricep2:["Overhead cable triceps extension","Overhead cable triceps extension"],
  core:["Cable crunch — kneeling","Hanging knee raise","Hanging leg raise"],
};
const DB = {
  squat:["Goblet squat","Goblet squat"], hinge:["Dumbbell Romanian deadlift","Dumbbell Romanian deadlift"], legs2:["Reverse lunge","Bulgarian split squat"],
  hamCurl:["Single-leg dumbbell RDL","Single-leg dumbbell RDL"], quadIso:["Step-up","Step-up"], calf:["Dumbbell standing calf raise","Single-leg dumbbell calf raise"],
  glute:["Dumbbell glute bridge","Dumbbell hip thrust"], abduct:["Side-lying hip abduction","Side-lying hip abduction"],
  hpush:["Dumbbell bench press — flat","Dumbbell bench press — flat"], ipush:["Dumbbell bench press — low incline","Dumbbell bench press — low incline"],
  fly:["Dumbbell fly — flat bench","Dumbbell fly — flat bench"], vpush:["Seated dumbbell shoulder press","Seated dumbbell shoulder press"],
  vpull:["Dumbbell pullover — flat bench","Dumbbell pullover — flat bench"], vpull2:["Bilateral dumbbell row","Bilateral dumbbell row"],
  hrow:["One-arm dumbbell row — bench supported","One-arm dumbbell row — bench supported"], hrow2:["Chest-supported dumbbell row","Chest-supported dumbbell row"],
  back2:["Dumbbell pullover — flat bench","Dumbbell pullover — flat bench"], lateral:["Dumbbell lateral raise — standing","Dumbbell lateral raise — standing"],
  rear:["Bent-over dumbbell reverse fly","Bent-over dumbbell reverse fly"], bicep:["Standing dumbbell curl","Standing dumbbell curl"], bicep2:["Hammer curl","Hammer curl"],
  tricep:["Dumbbell overhead triceps extension — seated","Dumbbell overhead triceps extension — seated"], tricep2:["Dumbbell skull crusher","Dumbbell skull crusher"],
  core:["Dead bug","Lying leg raise"],
};
const BW = {
  squat:["Bodyweight squat","Bodyweight squat"], hinge:["Single-leg bodyweight RDL","Single-leg bodyweight RDL"], legs2:["Bodyweight lunge","Bodyweight Bulgarian split squat"],
  hamCurl:["Single-leg glute bridge","Single-leg glute bridge","Nordic hamstring curl"], quadIso:["Step-up","Step-up"], calf:["Bodyweight calf raise","Single-leg calf raise"],
  glute:["Glute bridge","Single-leg hip thrust"], abduct:["Side-lying hip abduction","Side-lying hip abduction"],
  hpush:["Incline push-up","Push-up"], ipush:["Push-up","Decline push-up"], fly:["Knee push-up","Wide-grip push-up"], vpush:["Pike push-up","Pike push-up"],
  vpull:["Inverted row","Inverted row","Pull-up"], vpull2:["","","Chin-up"], hrow:["Inverted row","Inverted row"], hrow2:["",""], back2:["",""],
  lateral:["",""], rear:["Prone Y-raise","Prone Y-raise"], bicep:["",""], bicep2:["",""],
  tricep:["Bench dips","Diamond push-up"], tricep2:["Bodyweight triceps extension","Bodyweight triceps extension"], core:["Dead bug","Lying leg raise"],
};
const POOLS = {gym:GYM, db:DB, bw:BW};
const FILL = ["core","calf","glute","abduct","legs2","hinge","quadIso","tricep","rear","hpush","vpush"];
const STRENGTH = {squat:"High-bar back squat", hinge:"Conventional deadlift", hpush:"Barbell bench press — flat", vpush:"Barbell overhead press", hrow:"Barbell bent-over row"};
const ISOLATION = new Set(["hamCurl","quadIso","calf","abduct","fly","back2","lateral","rear","bicep","bicep2","tricep","tricep2","core"]);
// Workouts: kind (for focus extras), name, slots in order of importance (cut to fit the time).
const W = {
  fullA:["full","Full body A",["squat","hpush","vpull","hinge","lateral","bicep","core"]],
  fullB:["full","Full body B",["hinge","vpush","hrow","legs2","ipush","tricep","hamCurl"]],
  fullC:["full","Full body C",["legs2","ipush","vpull2","glute","rear","bicep2","calf"]],
  upperA:["upper","Upper A",["hpush","vpull","ipush","hrow","lateral","bicep","tricep"]],
  upperB:["upper","Upper B",["vpush","hrow2","fly","vpull2","rear","tricep2","bicep2"]],
  lowerA:["lower","Lower A",["squat","hinge","hamCurl","quadIso","calf","core","abduct"]],
  lowerB:["lower","Lower B",["legs2","glute","hamCurl","quadIso","calf","core","abduct"]],
  upper:["upper","Upper",["hpush","vpull","vpush","hrow","lateral","bicep","tricep"]],
  lower:["lower","Lower",["squat","hinge","hamCurl","quadIso","calf","core","glute"]],
  push:["push","Push",["hpush","vpush","ipush","lateral","tricep","fly","tricep2"]],
  pull:["pull","Pull",["vpull","hrow","hrow2","rear","bicep","bicep2","back2"]],
  legs:["legs","Legs",["squat","hinge","legs2","hamCurl","quadIso","calf","core"]],
};
// Workouts for each training day, in order, and why that split.
function splitFor(a){
  const n = a.days.length;
  if(n<=2) return [["fullA","fullB"], "Full-body workouts train every muscle each time, which suits 2 days a week."];
  if(n===3) return a.goal==="muscle" && a.exp==="exp"
    ? [["push","pull","legs"], "Push, pull and legs days give each muscle a full session, with room for more exercises."]
    : [["fullA","fullB","fullC"], "Full-body workouts train every muscle each time, which suits 3 days a week."];
  if(n===4) return [["upperA","lowerA","upperB","lowerB"], "An upper / lower split trains each muscle twice a week."];
  if(n===5) return [["upper","lower","push","pull","legs"], "Upper and lower days plus push, pull and legs train each muscle about twice a week."];
  return [["push","pull","legs","push","pull","legs"], "Push, pull and legs twice through trains each muscle twice a week."];
}
const FOCUS_SLOTS = {arms:["bicep2","tricep2","bicep","tricep"], shoulders:["lateral","rear"], chest:["fly","ipush"], back:["back2","hrow2","vpull2"],
  glutes:["glute","abduct"], legs:["legs2","quadIso","hamCurl"], core:["core"]};
const FOCUS_KINDS = {arms:["full","upper","pull","push"], shoulders:["full","upper","push"], chest:["full","upper","push"], back:["full","upper","pull"],
  glutes:["full","lower","legs"], legs:["full","lower","legs"], core:["full","upper","lower","push","pull","legs"]};

function nameFor(slot, a){
  const where = a.where || "gym";
  if(a.goal==="strength" && where==="gym" && STRENGTH[slot]) return STRENGTH[slot];
  const p = POOLS[where][slot] || ["",""]; return a.exp==="new" ? p[0] : a.exp==="exp" && p[2] ? p[2] : p[1];
}
// Sets and reps from the goal, experience, and whether it's the workout's main lift or an isolation move.
function itemFor(slot, a, first){
  const iso = ISOLATION.has(slot);
  let sets = a.exp==="new" ? 2 : 3, lo, hi;
  if(a.goal==="strength"){
    if(first && !iso){ sets += 1; [lo, hi] = a.exp==="new" ? [5,8] : a.exp==="exp" ? [3,5] : [4,6]; }
    else [lo, hi] = iso ? [8,12] : [6,10];
  }
  else if(a.goal==="fat") [lo, hi] = iso ? [12,15] : [10,15];
  else if(a.goal==="fit") [lo, hi] = iso ? [10,15] : [8,12];
  else { [lo, hi] = iso ? [10,15] : a.exp==="exp" ? [6,10] : [8,12]; if(first && a.exp==="exp") sets += 1; }
  return {exercise:nameFor(slot, a), sets, lo, hi};
}
// The first n exercises from these slots that exist where you train, with no repeats; then filler moves if short.
function pickSlots(slots, a, n){
  const out = [], names = new Set();
  for(const s of [...slots, ...FILL]){
    if(out.length>=n) break;
    const nm = nameFor(s, a); if(!nm || names.has(nm)) continue;
    names.add(nm); out.push(s);
  }
  return out;
}
function buildPlan(answers){
  const a = {where:"gym", ...answers, days:[...answers.days].sort((x,y)=>x-y), focus:[...(answers.focus||[])]};
  const [keys] = splitFor(a), n = perWorkout(a.mins), cardio = a.goal==="fat" ? 15 : a.goal==="fit" ? 10 : 0;
  const cardioName = a.where==="gym" ? "Incline treadmill walk" : "Walk";
  const pr = blankProgram(), ids = {}, kinds = {};
  pr.name = `My plan: ${label(GOALS, a.goal).toLowerCase()}`; pr.template = "quiz"; pr.quiz = a; pr.mode = "fixed";
  pr.prog = {on:true, upper: prefs.unit==="kg"?2.5:5, lower: prefs.unit==="kg"?5:10, unit:prefs.unit};
  keys.forEach(k=>{
    if(ids[k]) return;
    const [kind, name, slots] = W[k], id = pid("w");
    const items = pickSlots(slots, a, cardio ? n-1 : n).map((s,i)=>itemFor(s, a, i===0));
    if(cardio) items.push({exercise:cardioName, minutes:cardio});
    ids[k] = id; kinds[id] = kind; pr.workouts.push({id, name, items});
  });
  // Each focus area adds one exercise to the shortest workout that trains it.
  a.focus.forEach(f=>{
    const ws = pr.workouts.filter(w=>FOCUS_KINDS[f].includes(kinds[w.id])).sort((x,y)=>x.items.length-y.items.length);
    for(const w of ws){
      const slot = FOCUS_SLOTS[f].find(s=>nameFor(s, a) && !w.items.some(it=>it.exercise===nameFor(s, a)));
      if(!slot) continue;
      const at = w.items.length - (cardio ? 1 : 0);
      w.items.splice(at, 0, itemFor(slot, a, false)); return;
    }
  });
  a.days.forEach((d,i)=>{ pr.days[d] = ids[keys[i]]; });
  pr.rotation = [...new Set(keys)].map(k=>ids[k]);
  return pr;
}
// "Build muscle · 4 days · Some experience · 60 min · Arms" and the reason for the split.
function quizSummary(a){
  const bits = [label(GOALS, a.goal), label(WHERE, a.where || "gym"), `${a.days.length} days`, label(EXPS, a.exp), minsText(a.mins)];
  if(a.focus && a.focus.length) bits.push(a.focus.map(f=>label(FOCUS, f)).join(", "));
  return `${bits.join(" · ")}. ${splitFor(a)[1]}`;
}

// ---------- the questions ----------
let quiz = null;   // {step: 1–5, a: answers so far}
const quizActive = () => !!quiz;
// Answers saved before the "where" question existed were for a full gym.
function startQuiz(prev){ quiz = {step:1, a: prev ? {where:"gym", ...prev, days:[...prev.days], focus:[...(prev.focus||[])]} : {goal:"", where:"", days:[], exp:"", mins:0, focus:[]}}; }
const endQuiz = () => { quiz = null; };
const dayCount = n => n===0 ? "Pick the days you can train." : n===1 ? "1 day. Pick at least 2." : n===7 ? "7 days. Pick 2 to 6 so you get rest days." : `${n} days a week`;
function canGoOn(){
  const a = quiz.a, n = a.days.length;
  return [!!a.goal, !!a.where, n>=2 && n<=6, !!a.exp, !!a.mins, true][quiz.step-1];
}
function quizHTML(){
  const a = quiz.a, s = quiz.step;
  const head = (title, sub="") => `<div class="qz-top"><span class="qz-step">Question ${s} of 6</span><span class="qz-dots" aria-hidden="true">${[1,2,3,4,5,6].map(i=>`<i class="${i<=s?"on":""}"></i>`).join("")}</span></div>
    <h2>${title}</h2>${sub?`<p class="cal-sub" style="margin-top:-6px">${sub}</p>`:""}`;
  const tiles = (q, list, cur) => `<div class="tpl-list" role="group">${list.map(([k,b,t])=>`<button type="button" class="qz-opt" data-qa="${q}" data-v="${k}" aria-pressed="${k===cur}"><b>${esc(b)}</b><span>${esc(t)}</span></button>`).join("")}</div>`;
  let body;
  if(s===1) body = head("What's your main goal?") + tiles("goal", GOALS, a.goal);
  else if(s===2) body = head("Where do you train?") + tiles("where", WHERE, a.where);
  else if(s===3) body = head("Which days can you train?") + `<div class="qz-days" role="group" aria-label="Training days">${DOW.map((d,i)=>`<button type="button" data-qa="days" data-v="${i}" aria-pressed="${a.days.includes(i)}">${d}</button>`).join("")}</div>
    <p class="qz-count" aria-live="polite">${dayCount(a.days.length)}</p>`;
  else if(s===4) body = head("How long have you been lifting?") + tiles("exp", EXPS, a.exp);
  else if(s===5) body = head("How long is a workout?") + `<div class="seg" role="group" aria-label="Workout length">${MINS.map(m=>`<button type="button" data-qa="mins" data-v="${m}" aria-pressed="${a.mins===m}">${minsText(m)}</button>`).join("")}</div>
    <p class="cal-sub">${a.mins ? `${minsText(a.mins)} fits about ${perWorkout(a.mins)} exercises.` : "Pick the time you usually have, warm-up included."}</p>`;
  else body = head("Anything you want to focus on?", "Optional. Pick up to two.") + `<div class="seg" role="group" aria-label="Focus areas">${FOCUS.map(([k,l])=>`<button type="button" data-qa="focus" data-v="${k}" aria-pressed="${a.focus.includes(k)}">${l}</button>`).join("")}</div>`;
  return `<div class="panel">${body}<div class="btn-row"><button type="button" class="secondary" id="qz-back">Back</button><button type="button" class="primary" id="qz-next" ${canGoOn()?"":"disabled"}>${s===6?"Make my plan":"Next"}</button></div></div>
    <p class="foot">Plans from your answers are general starting points, not personalized advice. Adjust them to your experience, recovery and any injuries.</p>`;
}
// Handles a tap inside the quiz. Returns "done" (answers complete), "cancel", true (handled) or false (not a quiz tap).
function quizClick(t){
  if(!quiz) return false;
  const a = quiz.a;
  if(t.closest("#qz-back")){ if(quiz.step===1) return "cancel"; quiz.step--; return true; }
  if(t.closest("#qz-next")){ if(!canGoOn()) return true; if(quiz.step===6) return "done"; quiz.step++; return true; }
  const b = t.closest("[data-qa]"); if(!b) return false;
  const q = b.dataset.qa, v = b.dataset.v;
  if(q==="goal" || q==="where" || q==="exp") a[q] = v;
  else if(q==="mins") a.mins = +v;
  else if(q==="days"){ const d = +v; a.days = a.days.includes(d) ? a.days.filter(x=>x!==d) : [...a.days, d].sort((x,y)=>x-y); }
  else if(q==="focus") a.focus = a.focus.includes(v) ? a.focus.filter(x=>x!==v) : [...a.focus, v].slice(-2);
  return true;
}
const quizAnswers = () => quiz && quiz.a;

export { buildPlan, quizSummary, quizActive, startQuiz, endQuiz, quizHTML, quizClick, quizAnswers };
