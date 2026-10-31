// Lift Log: Showing logged entries, editing them, and calorie estimates.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- renderers ----------
// ---------- editing logged entries ----------
let editing = null; // entry id, or chain id for drop sets
const fld = (label, key, val, attrs) => `<div><label class="lbl">${label}</label><input data-ef="${key}" ${attrs||'type="text"'} value="${esc(val??"")}"></div>`;
const editActions = id => `<div class="edit-actions"><button class="primary" data-edit-save="${esc(id)}">Save changes</button><button class="secondary" data-edit-cancel>Cancel</button></div>`;
function editSetHTML(e){
  return `<div class="edit-box" data-edit-kind="set" data-id="${esc(e.id)}"><h4>Edit set</h4><div class="eq-grid">
    ${fld("Exercise","exercise",e.exercise)}
    ${fld("Date","date",e.date,'type="date"')}
    ${fld(`${e.equip&&e.equip.bw?"Added weight":barAddRaw(e.equip)>0?"Plates":"Weight"} (${prefs.unit})`,"weight",fmt(toUnit(e.weight,e.unit)),'type="number" inputmode="decimal" min="0" step="any"')}
    ${fld("Reps","reps",e.reps,'type="number" inputmode="numeric" min="1" step="1"')}
    ${fld("Note","note",e.note)}
  </div><label class="check"><input type="checkbox" data-ef="failure" ${e.failure?"checked":""}> Taken to failure</label>${editActions(e.id)}</div>`;
}
function editChainHTML(c){
  const steps = c.map((e,i)=>`<div class="edit-step" data-step-id="${esc(e.id)}"><button type="button" class="idx" data-step-fail aria-pressed="${!!e.failure}" aria-label="Step ${i+1}. Tap to toggle failure">${i+1}</button>
    <input data-sf="weight" type="number" inputmode="decimal" min="0" step="any" value="${fmt(toUnit(e.weight,e.unit))}" aria-label="Step ${i+1} weight">
    <input data-sf="reps" type="number" inputmode="numeric" min="1" step="1" value="${e.reps}" aria-label="Step ${i+1} reps">
    <button class="rm" data-step-rm aria-label="Remove step ${i+1}">×</button></div>`).join("");
  return `<div class="edit-box" data-edit-kind="chain" data-id="${esc(c[0].chain)}"><h4>Edit drop set</h4><div class="eq-grid">
    ${fld("Exercise","exercise",c[0].exercise)}
    ${fld("Date","date",c[0].date,'type="date"')}
    ${fld("Note","note",c[0].note)}
  </div>
  <div class="drop-head" style="margin-top:10px;grid-template-columns:30px 1fr 1fr 34px"><span>#</span><span>${barAddRaw(c[0].equip)>0?"Plates":"Weight"} (${prefs.unit})</span><span>Reps</span><span></span></div>
  <div class="edit-steps">${steps}</div>
  <p class="cal-sub">Tap a step number to mark it taken to failure.</p>
  ${editActions(c[0].chain)}</div>`;
}
function editCardioHTML(e){
  const T = cardioTypeOf(e.exercise), x = e.extra||{};
  const extras = (CARDIO_FIELDS[T]||[]).map(f=>{
    let v = f.k==="split" ? (x.splitSec>0 ? mmss(x.splitSec) : "") : (x[f.k] ?? "");
    const lab = f.k==="speed" ? `Speed (${x.speedUnit==="kmh"?"km/h":x.speedUnit==="mph"?"mph":spdU()})` : f.label();
    return `<div><label class="lbl">${lab}</label><input data-ex="${f.k}" type="${f.text?"text":"number"}" ${f.text?'inputmode="numeric"':'inputmode="decimal" min="0" step="any"'} placeholder="${esc(f.ph||"")}" value="${esc(v)}"></div>`;
  }).join("");
  const du = e.distUnit || distUnitFor(T);
  return `<div class="edit-box" data-edit-kind="cardio" data-id="${esc(e.id)}"><h4>Edit cardio</h4><div class="eq-grid">
    ${fld("Exercise","exercise",e.exercise)}
    ${fld("Date","date",e.date,'type="date"')}
    ${fld("Duration (min)","minutes",fmt(e.minutes),'type="number" inputmode="decimal" min="0" step="any"')}
    ${fld(`Distance (${du})`,"distance",e.distance>0?fmt(e.distance):"",'type="number" inputmode="decimal" min="0" step="any"')}
    <div><label class="lbl">Effort</label><select data-ef="effort">${["easy","moderate","hard"].map(l=>`<option value="${l}" ${(e.effort||"moderate")===l?"selected":""}>${cap(l)}</option>`).join("")}</select></div>
    ${extras}
    ${fld("Avg heart rate (bpm)","hr",e.hr||"",'type="number" inputmode="numeric" min="0" step="1"')}
    ${fld("Machine / watch calories","mk",e.machineKcal||"",'type="number" inputmode="numeric" min="0" step="1"')}
    ${fld("Note","note",e.note)}
  </div><label class="check"><input type="checkbox" data-ef="use" ${e.useMachine?"checked":""}> Count the machine's calories in my totals</label>
  ${editActions(e.id)}</div>`;
}
const canonName = name => { const n=name.trim().replace(/\s+/g," "); return exercisesByRecent().find(x=>x.toLowerCase()===n.toLowerCase()) || n; };
async function saveEdit(box){
  const kind = box.dataset.editKind, id = box.dataset.id;
  const val = k => { const i = box.querySelector(`[data-ef="${k}"]`); return i ? (i.type==="checkbox" ? i.checked : i.value.trim()) : ""; };
  const bad = msg => { notify(msg); return null; };
  const exercise = canonName(val("exercise")), date = val("date");
  if(!exercise) return bad("Enter an exercise name.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Choose a date.");
  const renamed = list => list[0].exercise.toLowerCase()!==exercise.toLowerCase();
  const newMuscle = old => isCardio(old) ? "Cardio" : (renamed([old]) ? groupOf(exercise) : old.muscle);
  let updates = [], removed = [];
  if(kind==="set"){
    const old = entries.find(e=>e.id===id); if(!old) return;
    const weight = parseFloat(val("weight")), reps = parseInt(val("reps"),10);
    if(!(weight>=0)) return bad("Weight must be 0 or more.");
    if(!(reps>=1)) return bad("Reps must be at least 1.");
    updates = [Object.assign({}, old, {exercise, date, weight, unit:prefs.unit, reps, note:val("note"), failure: !!val("failure"), muscle:newMuscle(old)})];
  } else if(kind==="chain"){
    const olds = entries.filter(e=>e.chain===id).sort((a,b)=>a.step-b.step); if(!olds.length) return;
    const rows = [...box.querySelectorAll("[data-step-id]")];
    if(!rows.length) return bad("A drop set needs at least one step. Use Delete to remove it entirely.");
    const keep = new Set(rows.map(r=>r.dataset.stepId));
    removed = olds.filter(e=>!keep.has(e.id)).map(e=>e.id);
    for(let i=0;i<rows.length;i++){
      const r = rows[i], old = olds.find(e=>e.id===r.dataset.stepId);
      const weight = parseFloat(r.querySelector('[data-sf="weight"]').value), reps = parseInt(r.querySelector('[data-sf="reps"]').value,10);
      if(!(weight>=0) || !(reps>=1)) return bad(`Check step ${i+1}: weight 0 or more, reps at least 1.`);
      updates.push(Object.assign({}, old, {exercise, date, weight, unit:prefs.unit, reps, step:i, note:val("note"), failure: r.querySelector("[data-step-fail]").getAttribute("aria-pressed")==="true", muscle:newMuscle(old)}));
    }
  } else {
    const old = entries.find(e=>e.id===id); if(!old) return;
    const minutes = parseFloat(val("minutes"));
    if(!(minutes>0)) return bad("Duration must be more than 0 minutes.");
    const e = Object.assign({}, old, {exercise, date, minutes, effort:val("effort")||"moderate", note:val("note")});
    const T = cardioTypeOf(exercise);
    const d = parseFloat(val("distance"));
    if(d>0){ e.distance=d; e.distUnit = old.distUnit || distUnitFor(T); } else { delete e.distance; delete e.distUnit; }
    const hr = parseFloat(val("hr")); if(hr>0) e.hr=hr; else delete e.hr;
    const mk = parseFloat(val("mk")); if(mk>0){ e.machineKcal=mk; e.useMachine=!!val("use"); } else { delete e.machineKcal; delete e.useMachine; }
    const x = {};
    box.querySelectorAll("[data-ex]").forEach(i=>{
      const k=i.dataset.ex;
      if(k==="split"){ const sp=parseSplit(i.value); if(sp) x.splitSec=sp; return; }
      const n=parseFloat(i.value); if(n>0) x[k]=n;
    });
    if(x.speed) x.speedUnit = (old.extra&&old.extra.speedUnit) || (prefs.unit==="kg"?"kmh":"mph");
    if(Object.keys(x).length) e.extra=x; else delete e.extra;
    updates=[e];
  }
  try{
    if(removed.length) await store.removeMany(removed);
    editing = null;
    await store.put(updates);
    renderAll();
  }catch(err){ notify("Couldn't save those changes. Try again."); }
}
document.addEventListener("click", e=>{
  const ed = e.target.closest("[data-edit]");
  if(ed){ editing = ed.dataset.edit; renderDay(); renderHistory(); return; }
  if(e.target.closest("[data-edit-cancel]")){ editing = null; renderDay(); renderHistory(); return; }
  const sv = e.target.closest("[data-edit-save]");
  if(sv){ saveEdit(sv.closest(".edit-box")); return; }
  const sf = e.target.closest("[data-step-fail]");
  if(sf){ sf.setAttribute("aria-pressed", String(sf.getAttribute("aria-pressed")!=="true")); return; }
  const rm = e.target.closest("[data-step-rm]");
  if(rm){ const box = rm.closest(".edit-box"); rm.closest(".edit-step").remove();
    box.querySelectorAll(".edit-step .idx").forEach((s,i)=>s.textContent=i+1); }
});

function setRow(e){
  if(editing===e.id) return editSetHTML(e);
  const w = loadOf(e), plates = toUnit(e.weight, e.unit), barA = barAddRaw(e.equip);
  const isBW = e.equip && e.equip.bw;
  const load = isBW ? (w>0 ? `BW + ${fmt(w)}<span class="x"> ${prefs.unit} × </span>` : `BW<span class="x"> × </span>`) : `${fmt(w)}<span class="x"> ${prefs.unit} × </span>`;
  const vt = [rirText(e.rir), variantText(e), barA>0 ? `${fmt(plates)} ${prefs.unit} plates + ${fmt(toUnit(barA,e.unit))} ${prefs.unit} bar` : ""].filter(Boolean).join(" · ");
  return `<div class="set${e.failure?" failed":""}"><span class="num">${load}${e.reps}${e.failure?'<span class="fail-badge" title="Taken to failure">F</span>':""}</span>${(e.note||e.equip||vt)?`<span class="note">${e.equip?`<span class="eq-line">${esc(equipText(e))}${loadMult(e.equip)>1?` · volume ×2 (${multReason(e.equip)})`:""}</span>`:""}${vt?`<span class="eq-line">${esc(vt)}</span>`:""}${esc(e.note||"")}</span>`:""}<button class="more" type="button" data-more aria-expanded="false" aria-label="Set actions">···</button><button class="edit" data-edit="${esc(e.id)}" aria-label="Edit set">Edit</button><button class="del" data-del="${esc(e.id)}" aria-label="Delete set">Delete</button></div>`;
}
function chainRow(c){
  if(editing===c[0].chain) return editChainHTML(c);
  const ws = c.map(e=>loadOf(e)), peak = Math.max(...ws);
  const up = ws.some((w,i)=>i>0 && w>ws[i-1]);
  const steps = c.map((e,i)=>`${i?'<span class="arrow">→</span>':""}<span class="${[ws[i]===peak&&c.length>1?"peak":"", e.failure?"failed":""].filter(Boolean).join(" ")}">${e.equip&&e.equip.bw ? (ws[i]>0?`BW+${fmt(ws[i])}`:"BW") : fmt(ws[i])}×${e.reps}</span>${e.failure?'<span class="fail">F</span>':""}`).join("");
  const eqt = [equipText(c[0]) + (loadMult(c[0].equip)>1 ? ` · volume ×2 (${multReason(c[0].equip)})` : ""), variantText(c[0])].filter(Boolean).join(" · ");
  const note = (c[0].note||eqt) ? `<div class="set"><span class="note">${eqt?`<span class="eq-line">${esc(eqt)}</span>`:""}${esc(c[0].note||"")}</span></div>` : "";
  return `<div class="chain"><div class="chain-top"><span class="tag">${up?"Pyramid":"Drop set"} · ${c.length}</span><button class="edit" data-edit="${esc(c[0].chain)}" aria-label="Edit this drop set">Edit</button><button class="del" data-del-chain="${esc(c[0].chain)}" aria-label="Delete this drop set">Delete</button></div><div class="chain-steps">${steps}</div>${note}</div>`;
}
// ---------- calorie estimate (MET method) ----------
// Approximate published activity ratings for weight training.
const MET = {light:3.0, moderate:3.5, vigorous:6.0};
const cap = w => w.charAt(0).toUpperCase()+w.slice(1);
let calOpen = false;
function dayCalc(date, list){
  list = (list || entries.filter(e=>e.date===date)).filter(e=>!isCardio(e));
  const kg = bwKgOn(date);
  if(!list.length || !kg) return null;
  const o = settings.days[date] || {};
  const ts = list.map(e=>e.ts).filter(t=>typeof t==="number" && t>1e12);
  const sameDay = ts.length>0 && ts.every(t=>isoOf(new Date(t))===date);
  const span = ts.length ? (Math.max(...ts)-Math.min(...ts))/60000 : 0;
  let mins, src;
  if(o.min>0){ mins=o.min; src="set by you"; }
  else if(sameDay && span>=10 && span<=240){ mins=Math.round(span+5); src="from your set times"; }
  else { mins=Math.max(10, Math.round(list.length*2.5)); src=`estimated from ${list.length} sets`; }
  const density = list.length/mins;
  const autoLvl = density>=0.45 ? "vigorous" : density>=0.25 ? "moderate" : "light";
  const lvl = (o.int && MET[o.int]) ? o.int : autoLvl;
  return {kcal: MET[lvl]*kg*mins/60, net: (MET[lvl]-1)*kg*mins/60, mins, src, lvl, autoLvl, isAuto: !(o.int && MET[o.int]), o};
}
function dayTotalCalories(date){
  const list = entries.filter(e=>e.date===date);
  const lift = dayCalc(date, list);
  const card = list.filter(isCardio).map(countedKcal).filter(k=>k!=null);
  if(!lift && !card.length) return null;
  return (lift?lift.kcal:0) + card.reduce((a,b)=>a+b,0);
}
function calHTML(list, editable){
  const date = list[0].date, strength = list.filter(e=>!isCardio(e)), cardio = list.filter(isCardio);
  const bwPrompt = `<p class="cal-sub" style="margin:0">Add your body weight to estimate calories burned.</p>
      <div class="cal-bw"><input type="number" id="bw-input" inputmode="decimal" min="0" step="any" placeholder="Body weight" aria-label="Body weight in ${prefs.unit}"><span>${prefs.unit}</span></div>`;
  const bwr = bwEntryOn(date), bwVal = bwr ? fmt(toUnit(bwr.w, bwr.unit)) : "";
  if(!hasBW(date) && !cardio.some(e=>countedKcal(e)!=null)) return editable ? `<div class="cal">${bwPrompt}</div>` : "";
  const c = strength.length ? dayCalc(date, strength) : null;
  const cardKc = cardio.map(countedKcal).filter(k=>k!=null).reduce((a,b)=>a+b,0);
  const cardMin = cardio.reduce((a,e)=>a+(e.minutes||0),0);
  const total = (c?c.kcal:0) + cardKc;
  const lines = [];
  if(c) lines.push(`Lifting ≈ ${Math.round(c.kcal).toLocaleString()}: ${cap(c.lvl)}${c.isAuto?" (auto)":""}, ${c.mins} min ${c.src}`);
  if(cardio.length) lines.push(`${cardio.some(isMob)?(cardio.every(isMob)?"Mobility":"Cardio & mobility"):"Cardio"} ≈ ${Math.round(cardKc).toLocaleString()}: ${fmtMin(cardMin)}`);
  let adj = "";
  if(editable && calOpen && c){
    adj = `<div class="eq-fields"><h4>Lifting estimate</h4><div class="eq-grid">
      <div><label class="lbl" for="cal-min">Lifting time (min)</label><input type="number" id="cal-min" inputmode="numeric" min="1" step="1" value="${c.o.min||""}" placeholder="${c.mins}"></div>
      <div><label class="lbl" for="cal-int">Intensity</label><select id="cal-int">
        <option value="" ${c.isAuto?"selected":""}>Auto (${cap(c.autoLvl)})</option>
        ${["light","moderate","vigorous"].map(l=>`<option value="${l}" ${!c.isAuto&&c.lvl===l?"selected":""}>${cap(l)}</option>`).join("")}</select></div>
      <div><label class="lbl" for="bw-input">Body weight this day (${prefs.unit})</label><input type="number" id="bw-input" inputmode="decimal" min="0" step="any" value="${bwVal}"></div>
    </div><p class="cal-sub">Clear the time box to go back to the automatic estimate. Body weight is saved for this day and carries forward until you change it. Cardio is estimated per entry. All calories are rough estimates.</p></div>`;
  } else if(editable && calOpen && !c){
    adj = `<div class="eq-fields"><div class="eq-grid"><div><label class="lbl" for="bw-input">Body weight this day (${prefs.unit})</label><input type="number" id="bw-input" inputmode="decimal" min="0" step="any" value="${bwVal}"></div></div></div>`;
  }
  return `<div class="cal"><div class="cal-main"><span class="num">≈ ${Math.round(total).toLocaleString()}</span><span>calories burned</span></div>
    ${lines.map(l=>`<p class="cal-sub">${esc(l)}</p>`).join("")}
    ${bwr && editable ? `<p class="cal-sub">Body weight used: ${bwVal} ${prefs.unit}${bwr.date===date?"":bwr.date?` (from ${niceDate(bwr.date)})`:""}</p>` : ""}
    ${!hasBW(date) && editable ? `<div style="margin-top:8px">${bwPrompt}</div>` : ""}
    ${editable && hasBW(date) ?`<button class="note-toggle" id="cal-adjust" aria-expanded="${calOpen}">${calOpen?"Done":"Adjust"}</button>${adj}`:""}</div>`;
}
document.addEventListener("change", e=>{
  const t = e.target, date = $("#date").value || today();
  if(t.id==="bw-input"){ const n=parseFloat(t.value); if(n>0) recordBW(date, n); else if(settings.bwLog) delete settings.bwLog[date]; saveSettings(); }
  else if(t.id==="cal-min"){ const n=parseInt(t.value,10); settings.days[date] = Object.assign({}, settings.days[date], {min: n>0 ? n : null}); saveSettings(); }
  else if(t.id==="cal-int"){ settings.days[date] = Object.assign({}, settings.days[date], {int: t.value || null}); saveSettings(); }
});
document.addEventListener("click", e=>{ if(e.target.id==="cal-adjust"){ calOpen=!calOpen; renderDay(); } });

function dayTotalHTML(list, editable){
  const str = list.filter(e=>!isCardio(e)), car = list.filter(e=>isCardio(e) && !isMob(e)), mob = list.filter(isMob);
  const sets=str.length, reps=str.reduce((a,e)=>a+e.reps,0), vol=str.reduce((a,e)=>a+volOf(e),0);
  const du = prefs.unit==="kg"?"km":"mi";
  const dist = car.filter(e=>e.distance>0).reduce((a,e)=>a+toMeters(e.distance,e.distUnit),0)/toMeters(1,du);
  const strStats = str.length ? `<div class="stats">
    <div class="stat"><div class="num">${sets.toLocaleString()}</div><small>Sets</small></div>
    <div class="stat"><div class="num">${reps.toLocaleString()}</div><small>Reps</small></div>
    <div class="stat"><div class="num">${Math.round(vol).toLocaleString()}</div><small>${prefs.unit==="kg"?"Kilograms":"Pounds"} lifted</small></div></div>` : "";
  const carStats = car.length ? `<div class="stats" style="${str.length?"margin-top:10px":""}">
    <div class="stat"><div class="num">${Math.round(car.reduce((a,e)=>a+(e.minutes||0),0)).toLocaleString()}</div><small>Cardio min</small></div>
    <div class="stat"><div class="num">${dist>0?fmt(Math.round(dist*100)/100):"—"}</div><small>Distance (${du})</small></div>
    <div class="stat"><div class="num">${car.length}</div><small>Cardio sessions</small></div></div>` : "";
  const mobStats = mob.length ? `<p class="cal-sub" style="font-weight:600;margin-top:10px">Mobility: ${fmtMin(mob.reduce((a,e)=>a+(e.minutes||0),0))} across ${mob.length} drill${mob.length===1?"":"s"}</p>` : "";
  return `<div class="day-total"><p class="lbl">Day total</p>${strStats}${carStats}${mobStats}${calHTML(list, editable)}</div>`;
}
function groupHTML(list, hist){
  const groups = new Map();
  list.forEach(e=>{ const k=e.exercise.toLowerCase(); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(e); });
  return [...groups.values()].map(g=>{
    if(isCardio(g[0])){
      const mins = g.reduce((s,e)=>s+(e.minutes||0),0);
      return `<div class="ex-group"><div class="ex-head"><h3>${hist ? `<button type="button" class="ex-name-btn" data-exinfo="${esc(g[0].exercise)}">${esc(g[0].exercise)}</button>` : esc(g[0].exercise)}</h3><span class="vol">${g.length>1?g.length+" sessions · ":""}${fmtMin(mins)}</span></div>${g.map(cardioRow).join("")}</div>`;
    }
    const vol = g.reduce((s,e)=>s+volOf(e),0);
    const parts=[], seen=new Set();
    g.forEach(e=>{
      if(!e.chain){ parts.push(setRow(e)); return; }
      if(seen.has(e.chain)) return; seen.add(e.chain);
      parts.push(chainRow(g.filter(x=>x.chain===e.chain).sort((a,b)=>a.step-b.step)));
    });
    const head = `<div class="ex-head"><h3>${hist ? `<button type="button" class="ex-name-btn" data-exinfo="${esc(g[0].exercise)}">${esc(g[0].exercise)}</button>` : esc(g[0].exercise)}${hist && isPR(g) ? ' <span class="pr">PR</span>' : ""}</h3><span class="vol">${g.length} set${g.length>1?"s":""} · ${fmtBig(vol)} ${prefs.unit}</span></div>`;
    const ids = new Set(g.map(e=>e.ss).filter(Boolean)), l = g[0].exercise.toLowerCase();
    const mates = [...new Set(list.filter(e=>ids.has(e.ss) && e.exercise.toLowerCase()!==l).map(e=>e.exercise))];
    const ssTag = mates.length ? `<p class="ss-tag">Superset with ${esc(mates.join(", "))}</p>` : "";
    return `<div class="ex-group">${head}${ssTag}${hist ? setBars(g) : ""}${parts.join("")}</div>`;
  }).join("");
}
// History: one bar per set, scaled to the heaviest load; the top set (best est. 1RM, 10 reps or fewer) is red.
const rankable = e => e.kind!=="cardio" && e.reps>0 && e.reps<=10;
const bestE1rm = list => list.filter(rankable).reduce((m,e)=>Math.max(m, e1rm(loadOf(e), e.reps)), 0);
function setBars(g){
  const loads = g.map(loadOf), max = Math.max(...loads), best = bestE1rm(g);
  const top = best>0 ? g.findIndex(e=>rankable(e) && e1rm(loadOf(e), e.reps)===best) : loads.indexOf(max);
  const bar = (e,i) => `<i class="${i===top?"top":""}" style="height:${max>0 ? Math.max(8, Math.round(100*loads[i]/max)) : 8}%"></i>`;
  return `<div class="bars" aria-hidden="true">${g.map(bar).join("")}</div>` +
    (g.length<=6 ? `<div class="bar-labels" aria-hidden="true">${g.map((e,i)=>`<span class="${i===top?"top":""}">${fmt(loads[i])}×${e.reps}</span>`).join("")}</div>` : "") +
    (best>0 ? `<p class="ex-foot">est. 1RM ${Math.round(best)} ${prefs.unit}</p>` : "");
}
// A PR beats every earlier day's best est. 1RM for the exercise. The first session doesn't count.
function isPR(g){
  const name = g[0].exercise.toLowerCase(), day = g[0].date;
  const before = bestE1rm(entries.filter(e=>e.date<day && e.exercise.toLowerCase()===name));
  return before>0 && bestE1rm(g)>before;
}

function renderDay(){
  const d = $("#date").value || today();
  $("#day-title").textContent = d===today() ? "Today" : niceDate(d);
  const list = sorted().filter(e=>e.date===d);
  $("#day-list").innerHTML = list.length ? groupHTML(list) + dayTotalHTML(list, true) : `<p class="empty">Nothing logged for this day yet.</p>`;
}
$("#date").addEventListener("change", ()=>{ renderDay(); updateBWForm(); renderPlanToday(); renderHead(); });
