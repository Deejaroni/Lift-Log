// Lift Log: Weekly programming: templates, schedules and progression.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- weekly programming ----------
const DOW = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const dowOf = iso => (new Date(iso+"T00:00:00").getDay()+6)%7;
const LOWER = new Set(["Quadriceps","Hamstrings","Glutes","Calves","Lower back"]);
const TIMED = new Set(["Cardio","Mobility"]);
const TEMPLATES = {
  ppl:{name:"Push / Pull / Legs", desc:"Six days a week (Mon–Sat), or rotate through Push → Pull → Legs. Each muscle is trained twice a week.",
    fixed:["push","pull","legs","push","pull","legs",null], rot:["push","pull","legs"], prog:[5,10], w:{
    push:["Push",["Barbell bench press — flat|4|6|10","Seated dumbbell shoulder press|3|8|12","Dumbbell bench press — low incline|3|8|12","Cable lateral raise — standing|3|12|15","Rope pushdown|3|10|15","Overhead cable triceps extension|3|10|15"]],
    pull:["Pull",["Lat pulldown — medium overhand|4|8|12","Seated cable row|3|8|12","Chest-supported dumbbell row|3|8|12","Face pull|3|12|15","EZ-bar curl|3|8|12","Hammer curl|3|10|12"]],
    legs:["Legs",["High-bar back squat|4|6|10","Romanian deadlift|3|8|10","Leg press|3|10|12","Seated leg curl|3|10|15","Leg extension machine|3|12|15","Standing calf raise|4|10|15"]]}},
  bro:{name:"Bro split", desc:"Five days, one muscle group per day: chest, back, shoulders, legs, arms.",
    fixed:["chest","back","shoulders","legs","arms",null,null], rot:["chest","back","shoulders","legs","arms"], prog:[5,10], w:{
    chest:["Chest",["Barbell bench press — flat|4|6|10","Dumbbell bench press — low incline|3|8|12","Seated chest press|3|10|12","Cable fly — mid pulley|3|12|15","Dips — chest emphasis|3|8|12"]],
    back:["Back",["Pull-up|3|6|10","Barbell bent-over row|4|6|10","Lat pulldown — neutral grip|3|10|12","Single-arm cable row|3|10|12","Straight-arm pulldown|3|12|15","Barbell shrug|3|10|12"]],
    shoulders:["Shoulders",["Seated dumbbell shoulder press|4|8|10","Dumbbell lateral raise — standing|4|12|15","Single-arm cable lateral raise|3|12|15","Reverse pec deck|3|12|15","Cable front raise|2|12|15","Dumbbell shrug|3|10|12"]],
    legs:["Legs",["Hack squat|4|8|10","Romanian deadlift|3|8|10","Bulgarian split squat|3|8|12","Lying leg curl|3|10|12","Leg extension machine|3|12|15","Seated calf raise|4|12|15"]],
    arms:["Arms",["EZ-bar curl|3|8|12","Close-grip bench press|3|6|10","Incline dumbbell curl|3|10|12","Rope pushdown|3|10|15","Hammer curl|3|10|12","Overhead cable triceps extension|3|10|15"]]}},
  full:{name:"Full body", desc:"Three days a week (Mon/Wed/Fri), alternating workouts A and B. Good when time is limited.",
    fixed:["a",null,"b",null,"a",null,null], rot:["a","b"], prog:[5,10], w:{
    a:["Full body A",["High-bar back squat|3|6|10","Barbell bench press — flat|3|6|10","Seated cable row|3|8|12","Romanian deadlift|3|8|10","Dumbbell lateral raise — standing|2|12|15","Hanging knee raise|2|10|15"]],
    b:["Full body B",["Conventional deadlift|3|4|6","Seated dumbbell shoulder press|3|8|12","Lat pulldown — medium overhand|3|8|12","Leg press|3|10|12","Dumbbell bench press — low incline|3|8|12","Cable crunch — kneeling|2|10|15"]]}},
  prog:{name:"Progressive (linear strength)", desc:"Three days a week on the big lifts, 3 sets of 5. Add weight every time you complete all reps. Progression stays on.",
    fixed:["a",null,"b",null,"a",null,null], rot:["a","b"], prog:[5,10], w:{
    a:["Workout A",["High-bar back squat|3|5|5","Barbell bench press — flat|3|5|5","Barbell bent-over row|3|5|5"]],
    b:["Workout B",["High-bar back squat|3|5|5","Barbell overhead press|3|5|5","Conventional deadlift|1|5|5"]]}},
  hyp:{name:"Hypertrophy (upper / lower)", desc:"Four days, stable machine and cable movements in 8–15 rep ranges, built for muscle growth.",
    fixed:["ua","la",null,"ub","lb",null,null], rot:["ua","la","ub","lb"], prog:[5,10], w:{
    ua:["Upper A",["Seated chest press|3|8|12","Lat pulldown — medium overhand|3|8|12","Dumbbell bench press — low incline|3|8|12","Chest-supported row machine|3|8|12","Single-arm cable lateral raise|3|12|20","Preacher curl machine|3|10|15","Rope pushdown|3|10|15"]],
    la:["Lower A",["Hack squat|3|8|12","Seated leg curl|3|10|15","Leg extension machine|3|12|15","Romanian deadlift|3|8|10","Standing calf raise|4|10|15"]],
    ub:["Upper B",["Cable fly — mid pulley|3|12|15","Seated cable row|3|8|12","Seated dumbbell shoulder press|3|8|12","Single-arm cable row|3|10|12","Reverse pec deck|3|12|20","Incline dumbbell curl|3|10|12","Overhead cable triceps extension|3|10|15"]],
    lb:["Lower B",["Leg press|3|10|15","Lying leg curl|3|10|15","Bulgarian split squat|3|8|12","Hip thrust machine|3|8|12","Hip abduction machine|2|12|20","Seated calf raise|4|12|15"]]}},
  pl:{name:"Powerlifting", desc:"Four days built around squat, bench and deadlift in low rep ranges, plus supporting accessories.",
    fixed:["sq","bp",null,"dl","bp2",null,null], rot:["sq","bp","dl","bp2"], prog:[5,10], w:{
    sq:["Squat day",["Low-bar back squat|5|3|5","Pause squat|3|3|5","Leg press|3|8|10","Lying leg curl|3|10|12","Hanging leg raise|3|8|12"]],
    bp:["Bench day",["Barbell bench press — flat|5|3|5","Close-grip bench press|3|5|8","Barbell bent-over row|4|6|8","Dumbbell lateral raise — standing|3|12|15","Rope pushdown|3|10|12"]],
    dl:["Deadlift day",["Conventional deadlift|4|3|5","Front squat|3|5|8","Romanian deadlift|3|6|8","Lat pulldown — medium overhand|3|8|10","45° back extension|3|10|12"]],
    bp2:["Bench volume day",["Paused bench press|4|4|6","Barbell overhead press|3|5|8","Weighted pull-up|3|5|8","Chest-supported dumbbell row|3|8|10","EZ-bar curl|3|8|12"]]}},
  mob:{name:"Mobility", desc:"Short daily sessions alternating hips/lower body and spine/shoulders. Logged by time.",
    fixed:["a","b","a","b","a","b",null], rot:["a","b"], prog:[5,10], w:{
    a:["Mobility A: hips & legs",["Dynamic warm-up|t5","Hip flexor stretch|t3","90/90 hip switches|t3","Couch stretch|t3","Deep squat hold|t3","Ankle mobility|t3"]],
    b:["Mobility B: spine & shoulders",["Cat-cow|t3","Thoracic spine rotations|t3","Shoulder dislocates (band/PVC)|t3","World's greatest stretch|t4","Child's pose|t2","Foam rolling|t5"]]}},
};

const hasProgram = () => !!(settings.program && settings.program.workouts && settings.program.workouts.length);
const pid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
function blankProgram(){
  return {name:"My program", template:"", mode:"fixed", days:[null,null,null,null,null,null,null], rotation:[], workouts:[],
    prog:{on:true, upper:5, lower:10, unit:prefs.unit}, deloadEvery:0, start:isoOf(weekStart(today())), done:{}, override:null};
}
function P(){ if(!settings.program) settings.program = blankProgram(); return settings.program; }
function parseItem(s){
  const [ex, a, b, c] = s.split("|");
  if(a && a[0]==="t") return {exercise:ex, minutes:+a.slice(1)};
  return {exercise:ex, sets:+a, lo:+b, hi:+c};
}
function loadTemplate(key){
  const T = TEMPLATES[key], ids = {}, old = settings.program;
  const pr = blankProgram();
  pr.name = T.name; pr.template = key; pr.mode = old ? old.mode : "fixed";
  pr.prog = {on:true, upper: prefs.unit==="kg"?2.5:T.prog[0], lower: prefs.unit==="kg"?5:T.prog[1], unit:prefs.unit};
  pr.deloadEvery = old ? old.deloadEvery : 0;
  Object.entries(T.w).forEach(([k,[name,items]])=>{ ids[k]=pid("w"); pr.workouts.push({id:ids[k], name, items:items.map(parseItem)}); });
  pr.days = T.fixed.map(k=>k?ids[k]:null); pr.rotation = T.rot.map(k=>ids[k]);
  settings.program = pr;
}
const workoutById = id => (settings.program && settings.program.workouts.find(w=>w.id===id)) || null;
function progWeek(date){
  const pr = P(); const s = weekStart(pr.start||today());
  return Math.max(1, Math.floor((weekStart(date) - s)/(7*864e5)) + 1);
}
const isDeload = date => { const pr=P(); return pr.deloadEvery>0 && progWeek(date)%pr.deloadEvery===0; };
// Which workout is planned for a date: what was done > a manual switch > the schedule.
function workoutFor(date){
  if(!hasProgram()) return null;
  const pr = settings.program;
  if(pr.done && pr.done[date] && workoutById(pr.done[date])) return pr.done[date];
  if(pr.override && pr.override.date===date) return pr.override.wid && workoutById(pr.override.wid) ? pr.override.wid : null;
  if(pr.mode==="fixed") return workoutById(pr.days[dowOf(date)]) ? pr.days[dowOf(date)] : null;
  const rot = pr.rotation.filter(id=>workoutById(id)); if(!rot.length) return null;
  const prev = Object.keys(pr.done||{}).filter(d=>d<date && rot.includes(pr.done[d])).sort().pop();
  return prev ? rot[(rot.indexOf(pr.done[prev])+1)%rot.length] : rot[0];
}
const loggedFor = (name, date) => entries.filter(e=>e.date===date && e.exercise.toLowerCase()===name.toLowerCase());
function suggestFor(item, date){
  const name = item.exercise, l = name.toLowerCase(), group = groupOf(name), pr = P();
  const deload = isDeload(date);
  if(TIMED.has(group) || item.minutes) return {timed:true, minutes:item.minutes||10, why:""};
  let sets = item.sets||3; const lo = item.lo||8, hi = Math.max(lo, item.hi||lo);
  const bw = BW_NAMES.has(l);
  const hist = entries.filter(e=>!isCardio(e) && e.exercise.toLowerCase()===l && e.date<date);
  let weight = null, reps = lo, why;
  if(hist.length){
    const lastDate = hist.reduce((m,e)=>e.date>m?e.date:m, "");
    const last = hist.filter(e=>e.date===lastDate).map(e=>({w:toUnit(e.weight,e.unit), r:e.reps}));
    const top = Math.max(...last.map(x=>x.w)), atTop = last.filter(x=>Math.abs(x.w-top)<0.01), minR = Math.min(...atTop.map(x=>x.r));
    weight = top;
    if(pr.prog.on && atTop.length>=sets && minR>=hi){
      if(bw && top===0){ reps = hi; why = `Top of the range on every set last time: add reps or added weight`; }
      else { const inc = toUnit(LOWER.has(group)?pr.prog.lower:pr.prog.upper, pr.prog.unit||"lb"); weight = top+inc; reps = lo;
        why = `+${fmt(inc)} ${prefs.unit}: you hit ${hi} reps on all ${sets} sets last time`; }
    } else {
      reps = Math.min(hi, Math.max(lo, minR + (pr.prog.on?1:0)));
      why = pr.prog.on ? `Same weight, aim for ${reps} reps (last time: ${atTop.map(x=>x.r).join(", ")})` : "Same as last time";
    }
  } else if(item.weight>0){ weight = toUnit(item.weight, item.unit||prefs.unit); why = "Target weight from your plan"; }
  else why = bw ? `Bodyweight: aim for ${lo}–${hi} reps` : `First time: pick a weight you can lift for ${lo}–${hi} reps`;
  if(deload){ sets = Math.max(1, Math.round(sets*0.6)); if(weight>0) weight = roundStep(weight*0.9); why = "Deload week: about 10% lighter, fewer sets"; }
  return {sets, reps, lo, hi, weight, why, bw};
}
const repText = it => it.minutes ? `${fmt(it.minutes)} min` : `${it.sets} × ${it.lo===it.hi?it.lo:`${it.lo}–${it.hi}`}`;

// ----- Today's plan (Log tab) -----
// Header: the tab's title, and on the Log tab the day's workout with a ring of its exercises.
let todayRing = null;   // {name, items:[{name, done}]} for the Log date's planned workout
function ringSVG(items){
  const n = items.length, C = 2*Math.PI*24, S = C/n, gap = n>1 ? Math.min(4, S/3) : 0;
  const cur = items.findIndex(x=>!x.done), doneN = items.filter(x=>x.done).length;
  return `<svg viewBox="0 0 58 58" width="58" height="58" role="img" aria-label="${doneN} of ${n} exercises done">${items.map((x,i)=>
    `<circle class="seg ${x.done?"done":i===cur?"now":"todo"}" cx="29" cy="29" r="24" stroke-dasharray="${(S-gap).toFixed(2)} ${(C-S+gap).toFixed(2)}" stroke-dashoffset="${(-i*S).toFixed(2)}" transform="rotate(-90 29 29)"/>`).join("")}<text x="29" y="34" text-anchor="middle">${doneN}/${n}</text></svg>`;
}
function renderHead(){
  const tab = document.querySelector('nav.tabs [aria-selected="true"]').dataset.tab, log = tab==="log";
  const date = $("#date").value || today(), r = log ? todayRing : null, next = r && r.items.find(x=>!x.done);
  $("#head-title").textContent = !log ? {plan:"Plan", history:"History", progress:"Progress"}[tab] : date===today() ? "Today" : niceDate(date);
  $("#head-kicker").textContent = !log ? "Lift Log" : [date===today() ? niceDate(date) : "Past day", r && r.name].filter(Boolean).join(" · ");
  $("#head-next").hidden = !next; $("#head-next").textContent = next ? `Next: ${next.name}` : "";
  $("#today-ring").hidden = !r; $("#today-ring").innerHTML = r ? ringSVG(r.items) : "";
}
function renderPlanToday(){
  const box = $("#plan-today"); todayRing = null;
  if(!hasProgram()){ box.hidden = true; return; }
  box.hidden = false;
  const pr = settings.program, date = $("#date").value || today(), wid = workoutFor(date), w = workoutById(wid);
  // Track what was actually done, so rotations advance and the week summary is right.
  const did = w && w.items.some(it=>loggedFor(it.exercise, date).length);
  if(w && did && pr.done[date]!==wid){ pr.done[date]=wid; saveSettings(); return; }
  if(pr.done[date] && !(workoutById(pr.done[date]) && workoutById(pr.done[date]).items.some(it=>loggedFor(it.exercise,date).length))){ delete pr.done[date]; saveSettings(); return; }
  const head = `${date===today()?"Today":niceDate(date)} · Week ${progWeek(date)}${isDeload(date)?" · Deload":""}`;
  const opts = `<option value="">${pr.mode==="fixed"?"As scheduled":"Next in rotation"}</option>` +
    pr.workouts.map(x=>`<option value="${esc(x.id)}" ${pr.override&&pr.override.date===date&&pr.override.wid===x.id?"selected":""}>${esc(x.name)}</option>`).join("") +
    `<option value="__rest" ${pr.override&&pr.override.date===date&&!pr.override.wid?"selected":""}>Rest day</option>`;
  let body, doneCt = 0; const ringItems = [];
  if(!w) body = `<p class="empty" style="padding:8px">Rest day. Pick a workout below if you're training anyway.</p>`;
  else body = w.items.map((it,i)=>{
    const s = suggestFor(it, date), got = loggedFor(it.exercise, date);
    const doneN = s.timed ? (got.length?1:0) : got.length, need = s.timed ? 1 : s.sets, complete = doneN>=need; if(complete) doneCt++; ringItems.push({name: it.exercise, done: complete});
    const target = s.timed ? `${fmt(s.minutes)} min` :
      `${s.sets} × ${s.lo===s.hi?s.lo:`${s.lo}–${s.hi}`}${s.weight>0?` @ ${s.bw?"BW + ":""}${fmt(s.weight)} ${prefs.unit}`:s.bw?" (bodyweight)":""}`;
    return `<div class="plan-item${complete?" done":""}"><div class="pi-main"><span class="pi-name">${complete?"✓ ":""}${esc(it.exercise)}</span>
      <span class="cardio-meta">${esc(target)}${it.rest&&!s.timed?` · rest ${mmss(it.rest)}`:""}${s.why?` · ${esc(s.why)}`:""}</span></div>
      <span class="tag">${s.timed?(complete?"Done":"—"):`${doneN}/${need}`}</span>
      <button class="edit" data-plan-start="${i}">${complete?"More":"Start"}</button></div>`;
  }).join("");
  if(w && ringItems.length) todayRing = {name: w.name, items: ringItems};
  renderHead();
  const open = !prefs.planCollapsed;
  box.innerHTML = `<div class="ex-head"><button type="button" class="plan-toggle" id="plan-toggle" aria-expanded="${open}"><span class="chev" aria-hidden="true">›</span><h2 style="margin:0">${w?esc(w.name):"Rest day"}</h2></button><span class="vol">${esc(head)}</span></div>
    ${open ? `${body}<div style="margin-top:12px"><label class="lbl" for="plan-switch">Switch workout for this day</label><select id="plan-switch">${opts}</select></div>`
      : `<p class="cal-sub" style="margin:4px 0 0">${w ? `${doneCt} of ${w.items.length} exercises done` : "Rest day"}. Tap the title to show the plan.</p>`}`;
}
function startPlanned(i){
  const date = $("#date").value || today(), w = workoutById(workoutFor(date)); if(!w) return;
  const it = w.items[i], s = suggestFor(it, date), group = groupOf(it.exercise);
  $("#group-filter").value = MUSCLES.includes(group) ? group : "";
  $("#group-filter").dispatchEvent(new Event("change"));
  const l = it.exercise.toLowerCase(), known = exercisesByRecent().find(n=>n.toLowerCase()===l) || EX_INDEX.get(l)?.name;
  if(known) chooseExercise(known, group);
  else { chooseNew(it.exercise); if(TIMED.has(group)) $("#muscle").value = group; applyFormKind(); }
  if(s.timed){ $("#c-min").value = fmt(s.minutes); }
  else {
    if(mode!=="straight") document.querySelector('.mode [data-mode="straight"]').click();
    const left = Math.max(1, s.sets - loggedFor(it.exercise, date).length);
    if(s.weight!=null) $("#weight").value = fmt(s.weight);
    $("#reps").value = s.reps; $("#sets").value = left;
  }
  updateVolPreview();
  restNext = s.timed ? null : (it.rest || null);
  $("#log-form").scrollIntoView({behavior:"smooth", block:"start"});
}
