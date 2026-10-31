// Lift Log: Strength standards, DOTS and tiers.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- strength standards ----------
// The app's own approximate tiers (not an official standard). Load lifts: estimated 1RM ÷ body weight needed
// to reach [Novice, Intermediate, Advanced, Elite]. Bodyweight lifts: reps in one set with no added weight.
const TIERS = ["Beginner","Novice","Intermediate","Advanced","Elite"];
const TIER_COLOR = ["--muted","--green","--blue","--yellow","--red"];
const STD = [
  {label:"Back squat", names:["high-bar back squat","low-bar back squat","back squat","barbell back squat","barbell squat","squat"], men:[1.0,1.5,2.0,2.5], women:[0.75,1.1,1.5,1.9]},
  {label:"Bench press", names:["barbell bench press — flat","bench press","barbell bench press","paused bench press"], men:[0.75,1.0,1.5,1.9], women:[0.45,0.65,0.9,1.15]},
  {label:"Deadlift", names:["conventional deadlift","sumo deadlift","deadlift","barbell deadlift"], men:[1.25,1.75,2.25,2.75], women:[1.0,1.35,1.75,2.25]},
  {label:"Overhead press", names:["barbell overhead press","standing barbell overhead press","overhead press","military press"], men:[0.5,0.7,0.9,1.15], women:[0.35,0.5,0.65,0.85]},
  {label:"Barbell row", names:["barbell bent-over row","pendlay row","barbell row","bent-over row"], men:[0.6,0.85,1.1,1.4], women:[0.4,0.6,0.8,1.05]},
  {label:"Pull-ups / chin-ups", reps:true, names:["pull-up","chin-up","neutral-grip pull-up"], men:[3,8,14,20], women:[1,4,8,13]},
  {label:"Push-ups", reps:true, names:["push-up"], men:[15,30,45,60], women:[6,15,25,40]},
  {label:"Dips", reps:true, names:["parallel bar dips","dips — chest emphasis","dips"], men:[8,15,25,35], women:[3,8,15,22]},
];
// DOTS (published powerlifting formula): score = total × 500 / (A + B·bw + C·bw² + D·bw³ + E·bw⁴), kg.
const DOTS_C = {men:[-307.75076,24.0900756,-0.1918759221,0.0007391293,-0.000001093], women:[-57.96288,13.6175032,-0.1126655495,0.0005158568,-0.0000010706]};
function dotsScore(totalKg, bwKg, std){
  const c = DOTS_C[std], x = Math.min(Math.max(bwKg,40), std==="men"?210:150);
  return totalKg*500/(c[0]+c[1]*x+c[2]*x*x+c[3]*x**3+c[4]*x**4);
}
const profile = () => settings.profile || {};
function ageNow(){ const y = +profile().birthYear; return y>1900 ? new Date().getFullYear()-y : null; }
const ageFactor = () => { const a = ageNow(); return a && a>40 ? 1 + 0.01*(a-40) : 1; };  // ≈1% per year past 40
let stdWindow = "90";
function stdSince(){ if(stdWindow==="all") return "0000"; const d = new Date(today()+"T00:00:00"); d.setDate(d.getDate()-90); return isoOf(d); }
function bestFor(def, since){
  const names = new Set(def.names);
  const list = entries.filter(e=>!isCardio(e) && names.has(e.exercise.toLowerCase()) && e.date>=since);
  if(def.reps){
    const sets = list.filter(e=>!(e.weight>0));
    return sets.length ? sets.reduce((m,e)=>e.reps>m.reps?e:m) : null;
  }
  let best = null;
  list.filter(e=>e.weight>0 && e.reps>=1 && e.reps<=10).forEach(e=>{
    const one = e1rm(e.unit==="kg"?totalRaw(e):totalRaw(e)*KG_PER_LB, e.reps), bw = bwKgOn(e.date);
    if(!bw) return;
    if(!best || one/bw>best.ratio) best = {ratio:one/bw, oneKg:one, date:e.date, exercise:e.exercise};
  });
  return best;
}
const tierOf = (v, th) => th.reduce((t,x,i)=> v>=x ? i+1 : t, 0);
function stdRow(def, std, af, bwNowKg, since){
  const th = def[std], b = bestFor(def, since);
  if(!b) return `<div class="std-row muted"><div class="std-top"><span class="std-name">${def.label}</span><span class="cal-sub" style="margin:0">Not logged${stdWindow==="90"?" in the last 90 days":""}</span></div></div>`;
  const raw = def.reps ? b.reps : b.ratio, adj = raw*af, t = tierOf(adj, th);
  const lo = t>0 ? th[t-1] : 0, hi = t<4 ? th[t] : null;
  const pct = hi ? Math.max(0, Math.min(100, (adj-lo)/(hi-lo)*100)) : 100;
  let detail, next = "";
  if(def.reps){
    detail = `Best set: ${b.reps} reps (${niceDate(b.date)})`;
    if(hi) next = `${Math.max(1, Math.ceil(hi/af) - b.reps)} more rep${Math.ceil(hi/af)-b.reps===1?"":"s"} to ${TIERS[t+1]}`;
  } else {
    detail = `Est. 1RM ${fmt(Math.round(toUnit(b.oneKg,"kg")))} ${prefs.unit} = ${b.ratio.toFixed(2)}× body weight (${esc(b.exercise)}, ${niceDate(b.date)})`;
    if(hi && bwNowKg){ const need = hi*bwNowKg/af - b.oneKg; next = need>0 ? `${fmt(Math.ceil(toUnit(need,"kg")))} ${prefs.unit} more on your est. 1RM to ${TIERS[t+1]}` : `${TIERS[t+1]} at your current body weight`; }
  }
  return `<div class="std-row"><div class="std-top"><span class="std-name">${def.label}</span><span class="tier" style="--tc:var(${TIER_COLOR[t]})">${TIERS[t]}</span></div>
    <span class="cardio-meta">${detail}</span>
    ${ladderHTML(t, pct)}
    <span class="cardio-meta">${hi ? next : "Top tier reached"}</span></div>`;
}
// Tier ladder: Novice → Elite, filled through the tiers you've reached plus your progress toward the next.
function ladderHTML(t, pct){
  return `<div class="ladder" role="img" aria-label="${TIERS[t]}, ${t<4 ? `${Math.round(pct)}% of the way to ${TIERS[t+1]}` : "top tier"}">${TIERS.slice(1).map((x,i)=>
    `<i><b style="width:${i<t ? 100 : i===t ? Math.round(pct) : 0}%"></b><span>${x}</span></i>`).join("")}</div>`;
}
// Lift card: best est. 1RM in the window, change over 30 days, a trend line of each day's best, and the tier.
function liftCard(def, std, af, bwNowKg, since){
  const names = new Set(def.names);
  const list = entries.filter(e=>!isCardio(e) && names.has(e.exercise.toLowerCase()) && e.weight>0 && rankable(e));
  const inWin = list.filter(e=>e.date>=since); if(!inWin.length) return null;
  const d30 = new Date(today()+"T00:00:00"); d30.setDate(d30.getDate()-30); const cut = isoOf(d30);
  const best = bestE1rm(inWin), recent = bestE1rm(list.filter(e=>e.date>=cut)), before = bestE1rm(list.filter(e=>e.date<cut));
  const diff = Math.round(recent - before);
  const change = recent>0 && before>0 ? (diff===0 ? "Same as 30 days ago" : `${diff>0?"+":"−"}${Math.abs(diff)} ${prefs.unit} in 30 days`) : "";
  const byDay = new Map(); inWin.forEach(e=>byDay.set(e.date, Math.max(byDay.get(e.date)||0, e1rm(loadOf(e), e.reps))));
  const pts = [...byDay.entries()].sort((a,b)=>a[0]<b[0]?-1:1).map(x=>x[1]);
  const lo = Math.min(...pts), span = Math.max(...pts)-lo || 1;
  const spark = pts.length>1 ? `<svg class="spark" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map((v,i)=>`${(200*i/(pts.length-1)).toFixed(1)},${(36-32*(v-lo)/span).toFixed(1)}`).join(" ")}"/></svg>` : "";
  let tier = "", ladder = "";
  const b = std && bwNowKg ? bestFor(def, since) : null;
  if(b){ const th = def[std], adj = b.ratio*af, t = tierOf(adj, th), lo2 = t>0 ? th[t-1] : 0, hi = t<4 ? th[t] : null;
    tier = `<span class="lc-tier">${TIERS[t]}</span>`; ladder = ladderHTML(t, hi ? Math.max(0, Math.min(100, (adj-lo2)/(hi-lo2)*100)) : 100); }
  return `<div class="lift-card"><div class="std-top"><span class="lc-name">${def.label}</span>${tier}</div>
    <div class="lc-big"><span class="lc-num">${Math.round(best)}</span><span class="lc-unit">${prefs.unit} est. 1RM</span>${change?`<span class="lc-change">${change}</span>`:""}</div>${spark}${ladder}</div>`;
}
function renderStandards(){
  const box = $("#std-panel"); if(!box) return;
  const pr = profile(), std = pr.std, age = ageNow(), af = ageFactor();
  const seg = `<div class="seg" role="group" aria-label="Standards to compare against">${[["men","Men's standards"],["women","Women's standards"]].map(([k,l])=>`<button data-std="${k}" aria-pressed="${std===k}">${l}</button>`).join("")}</div>`;
  const birth = `<div class="cal-bw" style="margin-top:10px"><label class="lbl" for="std-birth" style="margin:0">Birth year (optional)</label><input id="std-birth" type="number" inputmode="numeric" min="1900" max="${new Date().getFullYear()-10}" step="1" placeholder="e.g. 1985" value="${pr.birthYear||""}" style="max-width:130px"></div>`;
  if(!std){
    const cards = STD.filter(d=>!d.reps).map(d=>liftCard(d, null, af, null, stdSince())).filter(Boolean).join("");
    box.innerHTML = `${cards ? `<h2>Your lifts</h2><div class="lift-cards">${cards}</div>` : ""}<h2${cards?' style="margin-top:16px"':""}>Strength standards</h2><p class="cal-sub" style="margin-top:0">See how your lifts compare with typical strength levels for your sex, age and body weight. Choose which standards to compare against:</p>${seg}${birth}`;
    return;
  }
  const since = stdSince(), bwNowKg = bwKgOn(today());
  const rows = STD.map(d=>(!d.reps && liftCard(d, std, af, bwNowKg, since)) || stdRow(d, std, af, bwNowKg, since)).join("");
  const big = STD.slice(0,3).map(d=>bestFor(d, since));
  let dots;
  if(big.every(Boolean) && bwNowKg){
    const total = big.reduce((a,b)=>a+b.oneKg,0), sc = dotsScore(total, bwNowKg, std);
    dots = `<div class="stats" style="margin:10px 0 0;grid-template-columns:repeat(${af>1?3:2},1fr)">
      <div class="stat"><div class="num">${Math.round(sc)}</div><small>DOTS score</small></div>
      ${af>1?`<div class="stat"><div class="num">${Math.round(sc*af)}</div><small>Age-adjusted (${age})</small></div>`:""}
      <div class="stat"><div class="num">${fmtBig(toUnit(total,"kg"))}</div><small>Est. total (${prefs.unit})</small></div></div>
      <p class="cal-sub">From your best estimated 1RMs on squat, bench and deadlift, at your current body weight of ${fmt(toUnit(bwNowKg,"kg"))} ${prefs.unit}.</p>`;
  } else {
    const miss = STD.slice(0,3).filter((d,i)=>!big[i]).map(d=>d.label.toLowerCase());
    dots = `<p class="cal-sub">${!bwNowKg ? "Add your body weight (Day total on the Log tab) to see ratios and a DOTS score." : `DOTS score needs a logged ${miss.join(", ")} (sets of 10 reps or fewer).`}</p>`;
  }
  box.innerHTML = `<h2>Strength standards</h2>
    <p class="cal-sub" style="margin-top:0">Comparing with ${std==="men"?"men's":"women's"} standards${age?`, age ${age}`:""}. <button class="note-toggle" type="button" data-open-settings="set-std-sec" style="padding:0">Change in Settings</button></p>
    <div class="seg" role="group" aria-label="Time window" style="margin-top:10px">${[["90","Best in last 90 days"],["all","All-time best"]].map(([k,l])=>`<button data-stdwin="${k}" aria-pressed="${stdWindow===k}">${l}</button>`).join("")}</div>
    ${af>1?`<p class="cal-sub">Age-adjusted for ${age}: performance counted about ${Math.round((af-1)*100)}% higher (≈1% per year past 40).</p>`:""}
    ${dots}
    <div style="margin-top:6px">${rows}</div>
    <p class="foot" style="text-align:left">Tiers are the app's approximate estimates from body-weight ratios and rep counts commonly used in strength training, not an official standard. Est. 1RM uses sets of 10 reps or fewer. DOTS is the published formula powerlifting uses to compare lifters across body weights.</p>`;
}
$("#std-panel").addEventListener("click", e=>{
  const s = e.target.closest("[data-std]"); if(s){ settings.profile = Object.assign({}, profile(), {std:s.dataset.std}); saveSettings(); return; }
  const w = e.target.closest("[data-stdwin]"); if(w){ stdWindow = w.dataset.stdwin; renderStandards(); }
});
$("#std-panel").addEventListener("change", e=>{
  if(e.target.id!=="std-birth") return;
  const y = parseInt(e.target.value,10), max = new Date().getFullYear()-10;
  const p = Object.assign({}, profile());
  if(y>=1900 && y<=max) p.birthYear = y; else delete p.birthYear;
  settings.profile = p; saveSettings();
});
