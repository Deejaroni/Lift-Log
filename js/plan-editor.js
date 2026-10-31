// Lift Log: The Plan tab's editor.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

const addGroup = {}, addCustom = {};
function exOptionsFor(group){
  const names = [];
  CATALOG.filter(g=>g.muscle===group).forEach(g=>names.push(`<optgroup label="${esc(g.sub)}">${g.names.map(n=>`<option>${esc(n)}</option>`).join("")}</optgroup>`));
  const mine = exercisesByRecent().filter(n=>!CAT_MUSCLE.has(n.toLowerCase()) && groupOf(n)===group);
  if(mine.length) names.unshift(`<optgroup label="My exercises">${mine.map(n=>`<option>${esc(n)}</option>`).join("")}</optgroup>`);
  return `<option value="">Choose an exercise…</option>${names.join("")}<option value="__custom">＋ Type a name…</option>`;
}
const isTimedItem = it => it.minutes!=null || TIMED.has(groupOf(it.exercise));
function itemSummary(it){
  if(isTimedItem(it)) return `${fmt(it.minutes||10)} min`;
  return `${it.sets} × ${it.lo===it.hi?it.lo:`${it.lo}–${it.hi}`}` + (it.weight>0?` @ ${fmt(toUnit(it.weight, it.unit||prefs.unit))} ${prefs.unit}`:"") + (it.rest?` · rest ${mmss(it.rest)}`:"");
}
function itemFields(w, it, i){
  const id = `${w.id}|${i}`;
  const num = (k, val, label, attrs) => `<label class="pi-f"><span>${label}</span><input data-pi="${id}|${k}" type="number" ${attrs} value="${esc(val??"")}"></label>`;
  return `<div class="pi-fields">${isTimedItem(it) ? num("minutes", it.minutes||10, "Minutes", 'inputmode="decimal" min="1" step="any"') :
    num("sets", it.sets, "Sets", 'inputmode="numeric" min="1" step="1"') + num("lo", it.lo, "Reps from", 'inputmode="numeric" min="1" step="1"') +
    num("hi", it.hi, "to", 'inputmode="numeric" min="1" step="1"') +
    num("weight", it.weight>0?fmt(toUnit(it.weight, it.unit||prefs.unit)):"", `Start ${prefs.unit}`, 'inputmode="decimal" min="0" step="any" placeholder="opt."') +
    num("rest", it.rest||"", "Rest sec", 'inputmode="numeric" min="0" step="5" placeholder="def."')}</div>`;
}
function exRow(w, it, i){
  const key = `${w.id}|${i}`, open = itemEdit===key;
  return `<div class="ex-row"><span class="pi-name">${i+1}. ${esc(it.exercise)}</span><div class="ex-row-main"><span class="cardio-meta">${esc(itemSummary(it))}</span>
    <button class="edit" type="button" data-iedit="${key}" aria-expanded="${open}">${open?"Close":"Targets"}</button>
    <span class="pi-btns"><button type="button" data-pmove="${key}|-1" aria-label="Move ${esc(it.exercise)} up" ${i===0?"disabled":""}>↑</button><button type="button" data-pmove="${key}|1" aria-label="Move ${esc(it.exercise)} down" ${i===w.items.length-1?"disabled":""}>↓</button><button type="button" data-prm="${key}" aria-label="Remove ${esc(it.exercise)}">×</button></span></div>
    ${open ? itemFields(w, it, i) : ""}</div>`;
}
function daysFor(pr, wid){ return pr.mode==="fixed" ? DOW.filter((d,i)=>pr.days[i]===wid) : []; }
function scheduleSummary(pr){
  if(pr.mode==="fixed"){
    // This week as a list of training days; today's card opens into its exercises.
    const ws = weekStart(today()), rest = [];
    const cards = DOW.map((d,i)=>{ const dt = new Date(ws); dt.setDate(dt.getDate()+i); const iso = isoOf(dt), isToday = iso===today();
      const w = workoutById(isToday ? workoutFor(iso) : pr.days[i]), done = !!(pr.done && pr.done[iso]);
      if(!w){ rest.push(d); return ""; }
      const head = `<div class="ag-head"><b>${d} · ${esc(w.name)}</b>`;
      if(!isToday) return `<div class="ag-day${done?" done":""}">${head}<span>${done ? "Done ✓" : iso<today() ? "Not logged" : `${w.items.length} exercise${w.items.length===1?"":"s"}`}</span></div></div>`;
      const items = w.items.map(it=>{ const s = suggestFor(it, iso), got = loggedFor(it.exercise, iso).length;
        return {it, s, done: s.timed ? got>0 : got>=s.sets}; });
      const cur = items.findIndex(x=>!x.done), n = items.filter(x=>x.done).length;
      return `<div class="ag-day today">${head}<span>Today · ${n} of ${items.length}</span></div>
        ${items.map((x,j)=>`<div class="ag-ex${x.done?" done":j===cur?" now":""}"><span>${esc(x.it.exercise)}</span><small>${x.done?"Done":j===cur?"Now":esc(x.s.timed?`${fmt(x.s.minutes)} min`:`${x.s.sets} × ${x.s.lo===x.s.hi?x.s.lo:`${x.s.lo}–${x.s.hi}`}`)}</small></div>`).join("")}</div>`;
    }).join("");
    const restLine = !rest.length ? "" : `<p class="ag-rest">${rest.length===1 ? rest[0] : `${rest.slice(0,-1).join(", ")} and ${rest[rest.length-1]}`} ${rest.length===1?"is a rest day":"are rest days"}</p>`;
    return `<div class="agenda">${cards}${restLine}</div>`;
  }
  const next = workoutFor(today()), rot = pr.rotation.filter(id=>workoutById(id));
  return rot.length ? `<div class="rot-chips">${rot.map((id,i)=>`${i?'<span class="arrow" aria-hidden="true">→</span>':""}<span class="rot-chip${id===next?" next":""}">${esc(workoutById(id).name)}${id===next?" · next":""}</span>`).join("")}</div>`
    : `<p class="cal-sub">No workouts in the rotation yet.</p>`;
}
function scheduleEditor(pr){
  const wopts = sel => `<option value="">Rest</option>` + pr.workouts.map(w=>`<option value="${esc(w.id)}" ${w.id===sel?"selected":""}>${esc(w.name)}</option>`).join("");
  const mode = `<div class="seg" role="group" aria-label="Schedule type" style="margin-top:0"><button type="button" data-pmode="fixed" aria-pressed="${pr.mode==="fixed"}">Same days each week</button><button type="button" data-pmode="rotation" aria-pressed="${pr.mode==="rotation"}">Rotation</button></div>
    <p class="cal-sub">${pr.mode==="fixed" ? "Each weekday always gets the same workout." : "Workouts go in order. Each time you train, the next one comes up, so a missed day just shifts everything."}</p>`;
  if(pr.mode==="fixed") return mode + `<div class="sched" style="margin-top:10px">${DOW.map((d,i)=>`<label class="sched-row"><span>${d}</span><select data-day="${i}">${wopts(pr.days[i])}</select></label>`).join("")}</div>`;
  const rows = pr.rotation.map((id,i)=>{ const w = workoutById(id); if(!w) return "";
    return `<div class="sched-row rot"><span>${i+1}</span><span class="pi-name">${esc(w.name)}</span>
      <span class="pi-btns"><button type="button" data-rmove="${i}|-1" ${i===0?"disabled":""} aria-label="Move up">↑</button><button type="button" data-rmove="${i}|1" ${i===pr.rotation.length-1?"disabled":""} aria-label="Move down">↓</button><button type="button" data-rrm="${i}" aria-label="Remove from rotation">×</button></span></div>`; }).join("");
  return mode + `<div class="sched" style="margin-top:10px">${rows}</div>
    <select id="rot-add" aria-label="Add a workout to the rotation" style="margin-top:8px"><option value="">＋ Add a workout to the rotation…</option>${pr.workouts.map(w=>`<option value="${esc(w.id)}">${esc(w.name)}</option>`).join("")}</select>`;
}
function weekSummary(pr){
  const ws = weekStart(today()); let planned = 0, done = 0;
  for(let i=0;i<7;i++){ const d = new Date(ws); d.setDate(d.getDate()+i); const iso = isoOf(d);
    if(pr.mode==="fixed" && pr.days[i] && workoutById(pr.days[i])) planned++;
    if(pr.done && pr.done[iso]) done++; }
  return pr.mode==="fixed" ? `This week: ${done} of ${planned} planned workouts done.` : `This week: ${done} workout${done===1?"":"s"} done.`;
}
function templateList(cancelable){
  return `<div class="tpl-list">${Object.entries(TEMPLATES).map(([k,t])=>`<button type="button" class="tpl" data-tpl="${k}"><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join("")}
    <button type="button" class="tpl" data-tpl="__blank"><b>Build your own</b><span>Start empty and add workouts and exercises yourself.</span></button></div>
    ${cancelable?`<div class="btn-row"><button type="button" class="secondary" data-pedit="">Cancel</button></div>`:""}`;
}
function workoutCard(pr, w){
  if(planEdit!==w.id){
    const muscles = [...new Set(w.items.map(it=>groupOf(it.exercise)))].slice(0,4).join(", ");
    const days = daysFor(pr, w.id);
    return `<div class="wk-card"><div class="wk-sum"><div><b>${esc(w.name)}</b>
      <span class="cardio-meta">${w.items.length} exercise${w.items.length===1?"":"s"}${muscles?` · ${esc(muscles)}`:""}${days.length?` · ${days.join(", ")}`:""}</span></div>
      <button class="edit" type="button" data-pedit="${esc(w.id)}">Edit</button></div></div>`;
  }
  const g = addGroup[w.id] || "Chest";
  const add = addCustom[w.id]
    ? `<div class="cal-bw" style="margin-top:6px"><input type="text" id="custom-name" data-cname="${esc(w.id)}" placeholder="Exercise name" aria-label="New exercise name"><button type="button" class="secondary" data-cadd="${esc(w.id)}">Add</button><button type="button" class="note-toggle" data-ccancel="${esc(w.id)}">Cancel</button></div>`
    : `<div class="row pair"><div><label class="lbl">Muscle group</label><select data-addg="${esc(w.id)}">${MUSCLES.filter(m=>m!=="Other").map(m=>`<option ${m===g?"selected":""}>${m}</option>`).join("")}</select></div>
       <div><label class="lbl">Exercise</label><select data-adde="${esc(w.id)}">${exOptionsFor(g)}</select></div></div>`;
  return `<div class="wk-card open">
    <label class="lbl" for="wn-${esc(w.id)}">Workout name</label><input id="wn-${esc(w.id)}" data-wname="${esc(w.id)}" type="text" value="${esc(w.name)}">
    <p class="lbl" style="margin:14px 0 0">Exercises</p>
    <div class="ex-rows">${w.items.map((it,i)=>exRow(w,it,i)).join("") || `<p class="cal-sub">No exercises yet. Add one below.</p>`}</div>
    <div class="add-box"><p class="lbl" style="margin:0 0 6px">Add an exercise</p>${add}</div>
    <div class="btn-row"><button type="button" class="primary" data-pedit="">Done</button><button type="button" class="secondary danger" data-wdel="${esc(w.id)}">Delete workout</button></div>
  </div>`;
}
function renderPlan(){
  if($("#tab-plan").hidden) return;
  const pr = settings.program;
  if(!hasProgram() && !(pr && pr.template==="__blank")){
    $("#plan-root").innerHTML = `<div class="panel"><h2>Set up a weekly program</h2>
      <p class="cal-sub" style="margin-top:0">Your program decides what shows on the Log tab each day. Pick a template to start from, or build your own. You can change everything afterward.</p>
      ${templateList(false)}</div>
      <p class="foot">Templates are general starting points, not personalized advice. Adjust them to your experience, recovery and any injuries.</p>`;
    return;
  }
  const edit = (sec, label="Edit") => `<button class="edit" type="button" data-pedit="${planEdit===sec?"":sec}">${planEdit===sec?"Done":label}</button>`;
  const nameBlock = planEdit==="name"
    ? `<div class="cal-bw" style="margin:0"><input id="pg-name" type="text" value="${esc(pr.name)}" aria-label="Program name"><button type="button" class="primary" id="pg-name-save" style="padding:10px 14px;flex:none">Save</button></div>`
    : `<div class="plan-sec-head"><h2>${esc(pr.name)}</h2>${edit("name","Rename")}</div>`;
  const progSum = `${pr.prog.on?`Weight increases on: +${fmt(toUnit(pr.prog.upper, pr.prog.unit||"lb"))} ${prefs.unit} upper body, +${fmt(toUnit(pr.prog.lower, pr.prog.unit||"lb"))} ${prefs.unit} lower body`:"Weight increase suggestions off"} · Deload: ${pr.deloadEvery?`every ${pr.deloadEvery}th week`:"off"} · Program week ${progWeek(today())}${isDeload(today())?" (deload)":""}`;
  const progEdit = `<label class="check" style="margin-top:0"><input type="checkbox" id="pg-on" ${pr.prog.on?"checked":""}> Suggest weight increases (double progression)</label>
      <p class="cal-sub">When you hit the top of the rep range on every set, the next session suggests adding weight. Otherwise it suggests the same weight and one more rep.</p>
      <div class="eq-grid" style="margin-top:8px">
        <div><label class="lbl" for="pg-up">Upper-body step (${prefs.unit})</label><input id="pg-up" type="number" inputmode="decimal" min="0" step="any" value="${fmt(toUnit(pr.prog.upper, pr.prog.unit||"lb"))}"></div>
        <div><label class="lbl" for="pg-low">Lower-body step (${prefs.unit})</label><input id="pg-low" type="number" inputmode="decimal" min="0" step="any" value="${fmt(toUnit(pr.prog.lower, pr.prog.unit||"lb"))}"></div>
        <div><label class="lbl" for="pg-deload">Deload week</label><select id="pg-deload">${[[0,"Off"],[4,"Every 4th week"],[5,"Every 5th week"],[6,"Every 6th week"],[8,"Every 8th week"]].map(([v,l])=>`<option value="${v}" ${pr.deloadEvery==v?"selected":""}>${l}</option>`).join("")}</select></div>
      </div>
      <div class="btn-row"><button type="button" class="secondary" id="pg-restart">Restart at week 1</button></div>`;
  $("#plan-root").innerHTML = `
    <div class="panel">
      ${nameBlock}
      <p class="cal-sub" style="margin-top:4px">This program decides what shows on the Log tab each day. Tap <b>Edit</b> on any section to change it.</p>
      <div class="plan-sec-head" style="margin-top:14px"><h3>Schedule</h3>${edit("schedule")}</div>
      ${planEdit==="schedule" ? scheduleEditor(pr) : scheduleSummary(pr)}
      <p class="cal-sub" style="font-weight:600">${esc(weekSummary(pr))}</p>
    </div>
    <div class="panel">
      <div class="plan-sec-head"><h2>Workouts</h2></div>
      ${pr.workouts.map(w=>workoutCard(pr, w)).join("") || `<p class="cal-sub">No workouts yet.</p>`}
      <div class="btn-row"><button type="button" class="secondary" id="pg-addw">＋ New workout</button></div>
    </div>
    <div class="panel">
      <div class="plan-sec-head"><h2>Progression</h2>${edit("prog")}</div>
      ${planEdit==="prog" ? progEdit : `<p class="cal-sub" style="margin-top:4px">${esc(progSum)}</p>`}
    </div>
    <div class="panel">
      <div class="plan-sec-head"><h2>Change program</h2></div>
      ${planEdit==="change" ? `<p class="cal-sub" style="margin-top:0">Pick a new starting point. It replaces your current program; logged workouts aren't affected.</p>${templateList(true)}`
        : `<p class="cal-sub" style="margin-top:0">Switch to a different template, or remove the program to log freely.</p>
           <div class="btn-row"><button type="button" class="secondary" data-pedit="change">Switch template</button><button type="button" class="secondary danger" id="pg-clear">Remove program</button></div>`}
    </div>
    <p class="foot">Templates are general starting points, not personalized advice. Adjust them to your experience, recovery and any injuries.</p>`;
}
function planChanged(){ saveSettings(); }
$("#tab-plan").addEventListener("click", async e=>{
  const t = e.target, pr = settings.program;
  const tpl = t.closest("[data-tpl]");
  if(tpl){
    const k = tpl.dataset.tpl, nm = k==="__blank" ? "a blank program" : `"${TEMPLATES[k].name}"`;
    if(hasProgram() && !(await askConfirm(`Replace "${pr.name}" with ${nm}? Your logged workouts aren't affected.`, "Replace"))) return;
    const m = pr ? pr.mode : null;
    if(k==="__blank"){ settings.program = blankProgram(); settings.program.template="__blank"; if(m) settings.program.mode = m; } else loadTemplate(k);
    planEdit = k==="__blank" ? null : null; itemEdit = null; planChanged(); return;
  }
  if(!pr) return;
  const pe = t.closest("[data-pedit]"); if(pe){ planEdit = pe.dataset.pedit || null; itemEdit = null; renderPlan(); return; }
  if(t.id==="pg-name-save"){ pr.name = $("#pg-name").value.trim() || "My program"; planEdit = null; planChanged(); return; }
  const pm = t.closest("[data-pmode]"); if(pm){ pr.mode = pm.dataset.pmode; if(pr.mode==="rotation" && !pr.rotation.length) pr.rotation = pr.workouts.map(w=>w.id); planChanged(); return; }
  const ie = t.closest("[data-iedit]"); if(ie){ itemEdit = itemEdit===ie.dataset.iedit ? null : ie.dataset.iedit; renderPlan(); return; }
  const mv = t.closest("[data-pmove]"); if(mv){ const [wid,i,d] = mv.dataset.pmove.split("|"); const w = workoutById(wid), a=+i, b=a+(+d); [w.items[a],w.items[b]]=[w.items[b],w.items[a]]; itemEdit = null; planChanged(); return; }
  const rm = t.closest("[data-prm]"); if(rm){ const [wid,i] = rm.dataset.prm.split("|"); workoutById(wid).items.splice(+i,1); itemEdit = null; planChanged(); return; }
  const rmv = t.closest("[data-rmove]"); if(rmv){ const [i,d] = rmv.dataset.rmove.split("|").map(Number); [pr.rotation[i],pr.rotation[i+d]]=[pr.rotation[i+d],pr.rotation[i]]; planChanged(); return; }
  const rrm = t.closest("[data-rrm]"); if(rrm){ pr.rotation.splice(+rrm.dataset.rrm,1); planChanged(); return; }
  const wd = t.closest("[data-wdel]");
  if(wd){ const w = workoutById(wd.dataset.wdel);
    if(!(await askConfirm(`Delete the workout "${w.name}"? It's removed from your schedule too. Logged sets aren't affected.`, "Delete", true))) return;
    pr.workouts = pr.workouts.filter(x=>x.id!==w.id); pr.days = pr.days.map(d=>d===w.id?null:d); pr.rotation = pr.rotation.filter(x=>x!==w.id); planEdit = null; planChanged(); return; }
  const ca = t.closest("[data-cadd]");
  if(ca){ const wid = ca.dataset.cadd, name = ($("#custom-name").value||"").trim(); if(!name){ $("#custom-name").focus(); return; }
    const g = addGroup[wid] || "Chest";
    workoutById(wid).items.push(TIMED.has(g) ? {exercise:name, minutes:g==="Mobility"?3:20} : {exercise:name, sets:3, lo:8, hi:12});
    addCustom[wid] = false; planChanged(); return; }
  const cc = t.closest("[data-ccancel]"); if(cc){ addCustom[cc.dataset.ccancel] = false; renderPlan(); return; }
  if(t.id==="pg-addw"){ const w = {id:pid("w"), name:`Workout ${pr.workouts.length+1}`, items:[]}; pr.workouts.push(w); if(pr.mode==="rotation") pr.rotation.push(w.id); planEdit = w.id; planChanged(); return; }
  if(t.id==="pg-restart"){ pr.start = isoOf(weekStart(today())); planChanged(); return; }
  if(t.id==="pg-clear"){
    if(!(await askConfirm(`Remove "${pr.name}"? The Log tab goes back to free logging. Your logged workouts aren't affected.`, "Remove", true))) return;
    settings.program = null; planEdit = null; itemEdit = null; saveSettings(); return;
  }
});
$("#tab-plan").addEventListener("keydown", e=>{
  if(e.key!=="Enter") return;
  if(e.target.id==="pg-name"){ e.preventDefault(); $("#pg-name-save").click(); }
  if(e.target.id==="custom-name"){ e.preventDefault(); document.querySelector("[data-cadd]").click(); }
});
$("#tab-plan").addEventListener("change", e=>{
  const t = e.target, pr = settings.program; if(!pr) return;
  if(t.dataset.day!=null){ pr.days[+t.dataset.day] = t.value || null; return planChanged(); }
  if(t.id==="rot-add" && t.value){ pr.rotation.push(t.value); return planChanged(); }
  if(t.id==="pg-on"){ pr.prog.on = t.checked; return planChanged(); }
  if(t.id==="pg-up"||t.id==="pg-low"){ const up=parseFloat($("#pg-up").value), low=parseFloat($("#pg-low").value); if(up>=0 && low>=0) pr.prog = {on:pr.prog.on, upper:up, lower:low, unit:prefs.unit}; return planChanged(); }
  if(t.id==="pg-deload"){ pr.deloadEvery = +t.value; return planChanged(); }
  if(t.dataset.wname){ workoutById(t.dataset.wname).name = t.value.trim() || "Workout"; return planChanged(); }
  if(t.dataset.addg){ addGroup[t.dataset.addg] = t.value; renderPlan(); return; }
  if(t.dataset.adde){
    const w = workoutById(t.dataset.adde), g = addGroup[w.id] || "Chest", name = t.value; if(!name) return;
    if(name==="__custom"){ addCustom[w.id] = true; renderPlan(); setTimeout(()=>{ const c=$("#custom-name"); if(c) c.focus(); }, 0); return; }
    w.items.push(TIMED.has(g) || TIMED.has(groupOf(name)) ? {exercise:name, minutes:g==="Mobility"?3:20} : {exercise:name, sets:3, lo:8, hi:12});
    itemEdit = `${w.id}|${w.items.length-1}`;
    return planChanged();
  }
  if(t.dataset.pi){
    const [wid, i, k] = t.dataset.pi.split("|"), it = workoutById(wid).items[+i], n = parseFloat(t.value);
    if(k==="rest"){ if(n>0) it.rest=Math.round(n); else delete it.rest; }
    else if(k==="weight"){ if(n>0){ it.weight=n; it.unit=prefs.unit; } else { delete it.weight; delete it.unit; } }
    else if(n>0){ it[k] = k==="minutes" ? n : Math.round(n); if(k==="lo" && it.hi<it.lo) it.hi=it.lo; if(k==="hi" && it.lo>it.hi) it.lo=it.hi; }
    return planChanged();
  }
});
