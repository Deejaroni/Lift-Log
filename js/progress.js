// Lift Log: Progress tab: charts, consistency calendar and sets per muscle.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- charts ----------
let exChart=null, wkChart=null, metric="top", range="week", tot="vol";
const metricLabel = {top:"Top weight", e1rm:"Est. 1-rep max", vol:"Volume", reps:"Total reps"};

function chartDefaults(){
  Chart.defaults.font.family = "Archivo, system-ui, sans-serif";
  Chart.defaults.color = css("--muted");
  Chart.defaults.borderColor = css("--line");
}

const STR_METRICS = [["top","Top weight"],["e1rm","Est. 1-rep max"],["vol","Volume"],["reps","Total reps"]];
// ---------- consistency: month calendar and a weekly streak ----------
// The streak counts weeks in a row (Mon–Sun) with at least your goal of training days.
// This week only adds to it once the goal is met; until then it doesn't break it.
let calMonth = null;   // "YYYY-MM" being shown; null = this month
const weekGoal = () => prefs.weekGoal>=2 && prefs.weekGoal<=6 ? prefs.weekGoal : 3;
function renderConsistency(){
  const kinds = new Map();   // date -> "lift" or "cardio" (lifting wins when a day has both)
  entries.forEach(e=>{ if(kinds.get(e.date)!=="lift") kinds.set(e.date, isCardio(e) ? "cardio" : "lift"); });
  const perWeek = new Map();
  kinds.forEach((_, d)=>{ const w = isoOf(weekStart(d)); perWeek.set(w, (perWeek.get(w)||0) + 1); });
  const goal = weekGoal(), mon = weekStart(today()), now = perWeek.get(isoOf(mon)) || 0;
  let streak = now>=goal ? 1 : 0;
  for(const w = new Date(mon);;){ w.setDate(w.getDate()-7); if((perWeek.get(isoOf(w))||0)>=goal) streak++; else break; }
  const ym = calMonth || today().slice(0,7), [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m-1, 1), lead = (first.getDay()+6)%7, n = new Date(y, m, 0).getDate();
  let trained = 0, cells = "";
  for(let i=0;i<lead;i++) cells += `<span class="cal-day blank"></span>`;
  for(let d=1; d<=n; d++){
    const iso = `${ym}-${String(d).padStart(2,"0")}`, k = kinds.get(iso), cls = [k, iso===today()?"today":"", iso>today()?"future":""].filter(Boolean).join(" ");
    if(k){ trained++; cells += `<button type="button" class="cal-day ${cls}" data-day="${iso}" aria-label="${esc(niceDate(iso))}: ${k==="lift"?"lifting":"cardio or mobility"}">${d}</button>`; }
    else cells += `<span class="cal-day ${cls}" data-day="${iso}">${d}</span>`;
  }
  $("#consistency").innerHTML = `<h2>Consistency</h2>
    <div class="streak-row"><span class="streak num">${streak ? `${streak}-week streak` : "No streak yet"}</span><span class="week-now">${now} of ${goal} days this week</span></div>
    <div class="cal-nav"><button type="button" data-cal="-1" aria-label="Previous month">‹</button><span class="cal-title">${first.toLocaleDateString(undefined,{month:"long", year:"numeric"})}</span>
      <button type="button" data-cal="1" aria-label="Next month" ${ym>=today().slice(0,7)?"disabled":""}>›</button></div>
    <div class="cal-grid">${["M","T","W","T","F","S","S"].map(w=>`<span class="cal-wd">${w}</span>`).join("")}${cells}</div>
    <p class="cal-sum">${trained} training day${trained===1?"":"s"} this month <span class="cal-key"><i class="lift"></i>Lifting <i class="cardio"></i>Cardio or mobility</span></p>
    <p class="lbl" style="margin:12px 0 0">Weekly goal (training days)</p>
    <div class="seg" role="group" aria-label="Weekly goal">${[2,3,4,5,6].map(g=>`<button type="button" data-goal="${g}" aria-pressed="${g===goal}">${g}</button>`).join("")}</div>`;
}
$("#consistency").addEventListener("click", e=>{
  const nav = e.target.closest("[data-cal]"), g = e.target.closest("[data-goal]"), day = e.target.closest("button[data-day]");
  if(nav){
    const [y, m] = (calMonth || today().slice(0,7)).split("-").map(Number), d = new Date(y, m-1 + (+nav.dataset.cal), 1);
    calMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; renderConsistency();
  } else if(g){ prefs.weekGoal = +g.dataset.goal; savePrefs(); renderConsistency(); }
  else if(day){
    $("#hist-filter").value = ""; document.querySelector('nav.tabs [data-tab="history"]').click(); renderHistory();
    const p = document.getElementById("day-"+day.dataset.day); if(p) p.scrollIntoView({block:"start"});
  }
});

// ---------- sets per muscle: this week vs last week ----------
// Each set counts once for its main muscle and half for each muscle it also works. A drop set is one set; cardio doesn't count.
function muscleSets(from, to){
  const out = new Map(), chains = new Set();
  entries.forEach(e=>{
    if(e.date<from || e.date>to || isCardio(e)) return;
    if(e.chain){ if(chains.has(e.chain)) return; chains.add(e.chain); }
    const add = (m, n) => out.set(m, (out.get(m)||0) + n);
    add(groupOf(e.exercise), 1); alsoOf(e.exercise).forEach(m=>add(m, .5));
  });
  return out;
}
function renderMuscleSets(){
  const mon = weekStart(today()), prev = new Date(mon); prev.setDate(prev.getDate()-7);
  const sun = new Date(mon); sun.setDate(sun.getDate()-1);
  const now = muscleSets(isoOf(mon), today()), before = muscleSets(isoOf(prev), isoOf(sun));
  // The usual groups always show, so a skipped muscle stands out; Full body and Other only when used.
  const rows = MUSCLES.filter(m=>!TIMED.has(m) && ((m!=="Full body" && m!=="Other") || now.get(m) || before.get(m)));
  const top = Math.max(24, ...rows.map(m=>now.get(m)||0)), pct = n => Math.min(100, n/top*100);
  const tone = n => n<10 ? "low" : n<=20 ? "ok" : "high";
  $("#muscle-sets").innerHTML = `<h2>Sets per muscle</h2>
    <p class="cal-sub" style="margin:0 0 10px">This week (since Monday) and last week. A set counts half for each other muscle the lift works.</p>
    <div class="ms-head"><span></span><span></span><span>This wk</span><span>Last wk</span></div>` +
    rows.map(m=>{ const n = now.get(m)||0, l = before.get(m)||0;
      return `<div class="ms-row" data-m="${m}"><span class="ms-name">${m}</span>
        <span class="ms-track" aria-hidden="true"><i class="ms-band" style="left:${pct(10)}%;width:${pct(20)-pct(10)}%"></i><i class="ms-bar ${tone(n)}" style="width:${pct(n)}%"></i></span>
        <span class="ms-val num" aria-label="${fmt(n)} sets this week">${fmt(n)}</span><span class="ms-last" aria-label="${fmt(l)} last week">${fmt(l)}</span></div>`; }).join("") +
    `<p class="cal-sub" style="margin-top:10px">Shaded: 10–20 sets a week, a common target for muscle growth. It's a rough guide, not a rule.</p>`;
}
function renderProgress(){
  renderConsistency(); renderStandards(); renderMuscleSets();
  if(!window.Chart){ $("#prog-empty").hidden=false; $("#prog-empty").textContent="Charts couldn't load. Check your connection and reopen this page."; return; }
  chartDefaults();
  fillSelect($("#prog-ex"), false);
  const name = ($("#prog-ex").value||"").toLowerCase();
  const list = sorted().filter(e=>e.exercise.toLowerCase()===name);
  const cardio = list.length>0 && list.every(isCardio);
  const dayLabel = d=>new Date(d+"T00:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric"});
  let metrics, days, series, color, isBar, unitLabel, reverse=false, digits=1;
  if(cardio){
    const T = cardioTypeOf(list[0].exercise), du = prefs.unit==="kg"?"km":"mi";
    const distU = (T==="rower"||T==="skierg") ? "m" : T==="swim" ? (prefs.unit==="kg"?"m":"yd") : du;
    const paceName = (T==="rower"||T==="skierg") ? "Split /500 m" : (T==="bike"||T==="airbike") ? "Speed" : T==="swim" ? `Pace /100 ${distU}` : `Pace /${du}`;
    const byDay = new Map();
    list.forEach(e=>{ const d = byDay.get(e.date) || {min:0, dist:0, cal:0, distMin:0, wattsMin:0, watts:0};
      d.min += e.minutes||0; const k=countedKcal(e); if(k!=null) d.cal += k;
      if(e.distance>0){ d.dist += toMeters(e.distance,e.distUnit)/toMeters(1,distU); d.distMin += e.minutes; }
      const x=e.extra||{}; if(x.splitSec>0 && !(e.distance>0)){ d.splitSum=(d.splitSum||0)+x.splitSec*e.minutes; d.splitMin=(d.splitMin||0)+e.minutes; }
      byDay.set(e.date,d); });
    days = [...byDay.keys()];
    const pts = days.map(d=>byDay.get(d));
    const paceOf = p => {
      if(T==="rower"||T==="skierg"){ if(p.dist>0) return p.distMin*60/(p.dist/500); return p.splitMin ? p.splitSum/p.splitMin : null; }
      if(!(p.dist>0)) return null;
      if(T==="bike"||T==="airbike") return p.dist/(p.distMin/60);
      if(T==="swim") return p.distMin*60/(p.dist/100);
      return p.distMin/p.dist; // minutes per mile/km
    };
    metrics = list[0].kind==="mobility" ? [["min","Duration"],["cal","Calories"]] : [["min","Duration"],["dist","Distance"],["pace",paceName],["cal","Calories"]];
    if(!metrics.some(m=>m[0]===metric)) metric="min";
    series = pts.map(p=> metric==="pace" ? paceOf(p) : p[metric]);
    color = {min:css("--blue"), dist:css("--green"), pace:css("--red"), cal:css("--yellow")}[metric];
    isBar = metric==="min" || metric==="cal" || metric==="dist";
    reverse = metric==="pace" && !(T==="bike"||T==="airbike");
    unitLabel = {min:"min", dist:distU, cal:"cal", pace:(T==="bike"||T==="airbike")?(du==="km"?"km/h":"mph"):""}[metric];
    const totalMin = pts.reduce((a,p)=>a+p.min,0), totalDist = pts.reduce((a,p)=>a+p.dist,0);
    $("#prog-stats").innerHTML = `
      <div class="stat"><div class="num">${Math.round(Math.max(...pts.map(p=>p.min)))}</div><small>Longest (min)</small></div>
      <div class="stat"><div class="num">${totalDist>0?fmtBig(totalDist):"—"}</div><small>Total ${distU}</small></div>
      <div class="stat"><div class="num">${days.length}</div><small>Sessions</small></div>`;
    $("#prog-empty").hidden = series.some(v=>v!=null && v>0);
    $("#prog-empty").textContent = metric==="pace"||metric==="dist" ? "Log distance (or split/speed) to see this chart." : metric==="cal" ? "Add your body weight on the Log tab to see calories." : "Log this exercise to see a chart.";
  } else {
    const byDay = new Map();
    list.forEach(e=>{
      const w = loadOf(e);
      const d = byDay.get(e.date) || {top:0,e1rm:0,vol:0,reps:0,best:0};
      d.top = Math.max(d.top,w); d.e1rm = Math.max(d.e1rm, e1rm(w,e.reps)); d.vol += volOf(e); d.reps += e.reps; d.best = Math.max(d.best, e.reps);
      byDay.set(e.date,d);
    });
    days = [...byDay.keys()];
    const pts = days.map(d=>byDay.get(d));
    const bwEx = list.length>0 && list.every(e=>e.equip && e.equip.bw);
    metrics = bwEx ? [["best","Best set (reps)"],["reps","Total reps"],["top","Added weight"]] : STR_METRICS;
    if(!metrics.some(m=>m[0]===metric)) metric = bwEx ? "best" : "top";
    series = pts.map(p=>p[metric]);
    const best = pts.reduce((m,p)=>Math.max(m,p.top),0), bestE = pts.reduce((m,p)=>Math.max(m,p.e1rm),0);
    $("#prog-stats").innerHTML = !list.length ? "" : bwEx ? `
      <div class="stat"><div class="num">${pts.reduce((m,p)=>Math.max(m,p.best),0)}</div><small>Best set (reps)</small></div>
      <div class="stat"><div class="num">${pts.reduce((m,p)=>Math.max(m,p.reps),0)}</div><small>Most reps in a day</small></div>
      <div class="stat"><div class="num">${days.length}</div><small>Sessions</small></div>` : `
      <div class="stat"><div class="num">${fmt(best)}</div><small>Best ${prefs.unit}</small></div>
      <div class="stat"><div class="num">${fmt(bestE)}</div><small>Best est. 1RM</small></div>
      <div class="stat"><div class="num">${days.length}</div><small>Sessions</small></div>`;
    $("#prog-empty").hidden = days.length>0;
    $("#prog-empty").textContent = "Log this exercise on at least one day to see a chart.";
    color = {top:css("--red"), e1rm:css("--blue"), vol:css("--yellow"), reps:css("--green"), best:css("--red")}[metric];
    isBar = metric==="vol" || metric==="reps";
    unitLabel = (metric==="reps"||metric==="best") ? "reps" : prefs.unit;
  }
  $("#metric-seg").innerHTML = metrics.map(([k,l])=>`<button data-metric="${k}" aria-pressed="${k===metric}">${l}</button>`).join("");
  const label = metrics.find(m=>m[0]===metric)[1];
  const isTime = cardio && metric==="pace" && unitLabel==="";
  const show = v => isTime ? mmss(v*( /\/500|\/100/.test(label) ? 1 : 60)) : fmt(v);
  if(exChart) exChart.destroy();
  exChart = new Chart($("#ex-chart"),{
    type: isBar?"bar":"line",
    data:{labels:days.map(dayLabel),
      datasets:[{label, data:series.map(v=>v==null?null:Math.round(v*100)/100), borderColor:color, backgroundColor:isBar?color:color+"33", fill:!isBar, tension:.25, pointRadius:4, pointBackgroundColor:color, borderWidth:isBar?0:3, borderRadius:6, spanGaps:true}]},
    options:{responsive:true, maintainAspectRatio:false, animation:matchMedia("(prefers-reduced-motion: reduce)").matches?false:{duration:400},
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${label}: ${show(c.parsed.y)}${unitLabel?" "+unitLabel:""}${reverse?" (lower is faster)":""}`}}},
      scales:{y:{beginAtZero:isBar, reverse, grid:{color:css("--line")}, ticks:{callback:v=>show(v)}}, x:{grid:{display:false}}}}
  });
  renderWeekly();
}


function weekStart(iso){ const d=new Date(iso+"T00:00:00"); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return d; }
function isoOf(d){ const x=new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10); }

// Volume by range: Weekly = last 7 days by day; Monthly = last 5 weeks by week;
// 6 / 12 months = calendar months.
function renderWeekly(){
  const keys=[], labels=[], titles=[]; let keyOf;
  const now = new Date(today()+"T00:00:00");
  if(range==="week"){
    for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); keys.push(isoOf(d));
      labels.push(d.toLocaleDateString(undefined,{weekday:"short"})); titles.push(d.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})); }
    keyOf = e=>e.date;
  } else if(range==="month"){
    const start = weekStart(today()); start.setDate(start.getDate()-7*4);
    for(let i=0;i<5;i++){ const d=new Date(start); d.setDate(d.getDate()+7*i); keys.push(isoOf(d));
      const l=d.toLocaleDateString(undefined,{month:"short",day:"numeric"}); labels.push(l); titles.push("Week of "+l); }
    keyOf = e=>isoOf(weekStart(e.date));
  } else {
    const n = range==="6m" ? 6 : 12;
    for(let i=n-1;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1); keys.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));
      labels.push(d.toLocaleDateString(undefined,{month:"short"})); titles.push(d.toLocaleDateString(undefined,{month:"long",year:"numeric"})); }
    keyOf = e=>e.date.slice(0,7);
  }
  const totals = keys.map(()=>0), cals = keys.map(()=>0), mins = keys.map(()=>0), days = new Set();
  entries.forEach(e=>{ const i = keys.indexOf(keyOf(e)); if(i<0) return; days.add(e.date);
    if(isCardio(e)){ if(!isMob(e)) mins[i] += e.minutes||0; } else totals[i] += volOf(e); });
  days.forEach(d=>{ const i = keys.indexOf(keyOf({date:d})); const k = dayTotalCalories(d); if(i>=0 && k!=null) cals[i] += k; });
  const sum = totals.reduce((a,b)=>a+b,0), calSum = cals.reduce((a,b)=>a+b,0), minSum = mins.reduce((a,b)=>a+b,0);
  const parts = [];
  if(sum) parts.push(`${Math.round(sum).toLocaleString()} ${prefs.unit} lifted`);
  if(minSum) parts.push(`${Math.round(minSum).toLocaleString()} cardio min`);
  if(calSum) parts.push(`≈ ${Math.round(calSum).toLocaleString()} calories`);
  $("#range-total").textContent = !days.size ? "Nothing logged in this range yet." :
    parts.join(" · ") + ` across ${days.size} workout day${days.size===1?"":"s"}` +
    (tot==="cal" && !(settings.bw>0) && !Object.keys(settings.bwLog||{}).length ? ". Add your body weight under Day total on the Log tab to see calories." : "");
  const showCal = tot==="cal", showMin = tot==="min";
  if(wkChart) wkChart.destroy();
  wkChart = new Chart($("#week-chart"),{
    type:"bar",
    data:{labels, datasets:[{label: showCal?"Calories":showMin?"Cardio minutes":"Volume", data:(showCal?cals:showMin?mins:totals).map(v=>Math.round(v)), backgroundColor:css(showCal?"--yellow":showMin?"--green":"--blue"), borderRadius:5}]},
    options:{responsive:true, maintainAspectRatio:false, animation:matchMedia("(prefers-reduced-motion: reduce)").matches?false:{duration:400},
      plugins:{legend:{display:false}, tooltip:{callbacks:{title:c=>titles[c[0].dataIndex], label:c=> showCal ? `≈ ${c.parsed.y.toLocaleString()} calories` : showMin ? `${c.parsed.y.toLocaleString()} cardio minutes` : `${c.parsed.y.toLocaleString()} ${prefs.unit} lifted`}}},
      scales:{y:{beginAtZero:true, grid:{color:css("--line")}}, x:{grid:{display:false}}}}
  });
}


$("#prog-ex").addEventListener("change", renderProgress);
$("#metric-seg").addEventListener("click", e=>{
  const b=e.target.closest("[data-metric]"); if(!b) return;
  metric=b.dataset.metric; renderProgress();
});
document.querySelectorAll("#tot-seg button").forEach(b=>b.onclick=()=>{
  tot=b.dataset.tot;
  document.querySelectorAll("#tot-seg button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  renderWeekly();
});
document.querySelectorAll("#range-seg button").forEach(b=>b.onclick=()=>{
  range=b.dataset.range;
  document.querySelectorAll("#range-seg button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  renderWeekly();
});
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", ()=>{ if(!$("#tab-progress").hidden) renderProgress(); });
