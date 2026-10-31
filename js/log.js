// Lift Log: Helpers, units, tabs, and the Log form: sets, drop sets, supersets, volume, plates and exercise hints.
// ES module. Its start-up code runs in init(), which js/app.js calls in a fixed order (see docs/DECISIONS.md).

import { $, KG_PER_LB } from "./ui.js";
import { entries, prefs, savePrefs, store } from "./state.js";
import { applyEquip, applyFormKind, bwFields, cardioTypeOf, equipField, equipState, isBWForm, isCardioForm, readCardioVals, rememberBodyWeight, renderCardioDetails, renderEquipFields, resetForm, saveCardio, saveDrop, suggestEquip } from "./equipment.js";
import { renderProgress } from "./progress.js";
import { renderHead } from "./plan.js";
import { renderPlan } from "./plan-editor.js";
import { finishRest, renderAll, restEnd, startRest, unlockAudio, updateEquipSummary } from "./main.js";

// ---------- helpers ----------
const today = ()=>{ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const uid = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const toUnit = (w, from)=> from===prefs.unit ? w : (prefs.unit==="kg" ? w*KG_PER_LB : w/KG_PER_LB);
const fmt = n => { const r = Math.round(n*10)/10; return (r%1===0? r.toFixed(0): r.toFixed(1)); };
const fmtBig = n => n>=10000 ? (n/1000).toFixed(1)+"k" : Math.round(n).toLocaleString();
const e1rm = (w,r)=> r<=1 ? w : w*(1+r/30); // Epley
const niceDate = iso => new Date(iso+"T00:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year: iso.slice(0,4)===today().slice(0,4)?undefined:"numeric"});
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const sorted = ()=> entries.slice().sort((a,b)=> a.date===b.date ? (a.ts||0)-(b.ts||0) : a.date<b.date?-1:1);
const exercisesByRecent = ()=>{
  const seen = new Map();
  sorted().reverse().forEach(e=>{ const k=e.exercise.trim(); if(!seen.has(k.toLowerCase())) seen.set(k.toLowerCase(), k); });
  return [...seen.values()];
};
const lastFor = name => sorted().reverse().find(e=>e.kind!=="cardio" && e.exercise.toLowerCase()===name.toLowerCase());
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function flash(text, err){ const m=$("#msg"); m.textContent=text; m.className="msg"+(err?" err":""); clearTimeout(flash.t); flash.t=setTimeout(()=>m.textContent="",2600); }

// ---------- unit toggle ----------
function applyUnit(){
  document.querySelectorAll(".unit-toggle button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.unit===prefs.unit)));
  $("#w-unit").textContent = prefs.unit;
}
// Quick-add chips: common plate jumps for the current unit.
const quickSteps = () => prefs.unit==="kg" ? [1.25,5,20] : [2.5,10,45];
function renderQuick(){ $("#quick-add").innerHTML = quickSteps().map(s=>`<button type="button" data-quick="${s}" aria-label="Add ${s} ${prefs.unit}">+${s}</button>`).join(""); }
function showLast(name){
  const last = name && lastFor(name);
  $("#w-last").textContent = last ? `Last ${fmt(toUnit(last.weight, last.unit))} × ${last.reps}` : "";
}
function prefill(name){
  const last = lastFor(name);
  showLast(name);
  if(!last){ applyEquip(suggestEquip(name), prefs.unit); return; }
  if(last){
    applyEquip(last.equip, last.unit);
    $("#weight").value = fmt(toUnit(last.weight, last.unit));
    $("#reps").value = last.reps;
    if(mode==="drop" && dropRows.length<=1){ dropRows=[{weight:fmt(toUnit(last.weight,last.unit)), reps:last.reps}]; renderDropRows(); }
  }
}

// ---------- drop / pyramid builder ----------
let mode = "straight", dropRows = [];
const stepSize = ()=> prefs.unit==="kg"?2.5:5;
const roundStep = w => Math.max(0, Math.round(w/stepSize())*stepSize());
function readDropRows(){
  document.querySelectorAll("#drop-rows .drop-row").forEach((r,i)=>{
    dropRows[i] = {weight:r.querySelector("[data-f=w]").value, reps:r.querySelector("[data-f=r]").value, fail: !!(dropRows[i] && dropRows[i].fail)};
  });
}
function renderDropRows(){
  const peak = dropRows.reduce((m,r,i)=> (parseFloat(r.weight)||0) > (parseFloat(dropRows[m]?.weight)||0) ? i : m, 0);
  const cell = (f,i,val,attrs,label)=>`<div class="dcell"><button type="button" data-dstep="${f}" data-dir="-1" aria-label="Decrease set ${i+1} ${label}">−</button><input data-f="${f}" type="number" ${attrs} value="${esc(val)}" aria-label="Set ${i+1} ${label}"><button type="button" data-dstep="${f}" data-dir="1" aria-label="Increase set ${i+1} ${label}">+</button></div>`;
  $("#drop-rows").innerHTML = `<div class="drop-head"><span>#</span><span>${weightLabel().replace(" weight","")} (${prefs.unit})</span><span>Reps</span><span></span></div>` +
    dropRows.map((r,i)=>`<div class="drop-row${r.fail?" fail":""}">
      <button type="button" class="idx" data-dfail="${i}" aria-pressed="${!!r.fail}" aria-label="Set ${i+1}${r.fail?", taken to failure":""}. Tap to ${r.fail?"unmark":"mark"} failure">${i+1}</button>
      ${cell("w",i,r.weight,'inputmode="decimal" min="0" step="any"',"weight")}
      ${cell("r",i,r.reps,'inputmode="numeric" min="1" step="1"',"reps")}
      <button class="rm" data-rm="${i}" aria-label="Remove set ${i+1}" ${dropRows.length===1?"disabled":""}>×</button></div>`).join("");
  renderDropStep();
}
// Drop step: fixed 5 lb (2.5 kg) increments, each labeled with its percent of the weight you're dropping from.
// Until you pick one, the step is about 20% of the first set.
let dropStep = 0, dropPicked = false;
function renderDropStep(){
  const inc = stepSize(), last = dropRows[dropRows.length-1], w = parseFloat(last && last.weight)||0;
  if(!dropPicked) dropStep = Math.max(inc, roundStep((parseFloat(dropRows[0] && dropRows[0].weight)||0)*0.2));
  const n = Math.min(40, Math.max(8, Math.ceil(w*0.5/inc), dropStep/inc));
  $("#drop-step").innerHTML = Array.from({length:n}, (_,i)=>{ const s = (i+1)*inc;
    return `<option value="${s}" ${s===dropStep?"selected":""}>${fmt(s)} ${prefs.unit}${w>0?` (${Math.round(100*s/w)}%)`:""}</option>`; }).join("");
}
function addDropRow(dir){
  readDropRows();
  const last = dropRows[dropRows.length-1] || {weight:$("#weight").value, reps:$("#reps").value};
  const w = parseFloat(last.weight)||0;
  const nw = Math.max(0, w + dir*dropStep);
  dropRows.push({weight:fmt(nw), reps:last.reps, fail:false});
  renderDropRows();
  const inputs=document.querySelectorAll("#drop-rows [data-f=r]"); inputs[inputs.length-1]?.focus();
}

// ---------- supersets: rest waits until the next exercise is logged ----------
// Logging with the switch on marks the set as the start (ssLead) of a superset and skips rest. The next set
// logged, of any exercise, joins it (same ss id); rest starts after that one unless the switch is on again.
let ssOpen = null;   // {id, date, name} while a superset waits for its next exercise
function supersetFields(date){
  const open = ssOpen && ssOpen.date===date ? ssOpen.id : null;
  if($("#ss-on").checked) return {ss: open || uid(), ssLead:true};
  return open ? {ss: open} : {};
}
// Returns true when rest should start now.
function supersetLogged(f, date, name){
  if(f.ssLead){ ssOpen = {id:f.ss, date, name}; if(restEnd) finishRest(true); return false; }
  ssOpen = null; return true;
}
function renderSuperset(){
  const h = $("#ss-hint");
  h.textContent = $("#ss-on").checked ? "Rest waits until you log the next exercise."
    : ssOpen ? `Superset with ${ssOpen.name}: rest starts after the next set you log.` : "";
  h.hidden = !h.textContent;
}
// Picking an exercise that started a superset earlier today turns the switch back on for the next round.
function supersetFor(name){
  const l = name.toLowerCase(), last = sorted().reverse().find(e=>e.date===($("#date").value||today()) && e.exercise.toLowerCase()===l);
  $("#ss-on").checked = !!(last && last.ssLead); renderSuperset();
}

// ---------- volume rules ----------
// Unilateral sets (reps per side, both sides worked) and two implements with "weight is per hand/bell" count double.
function loadMult(eq){
  if(!eq) return 1;
  if(Object.values(eq).some(o=>o && o.side==="One side (unilateral)")) return 2;
  if(eq.db && eq.db.each) return 2;
  if(eq.kb && eq.kb.each && eq.kb.count==="Two kettlebells") return 2;
  return 1;
}
function multReason(eq){
  if(!eq) return "";
  if(Object.values(eq).some(o=>o && o.side==="One side (unilateral)")) return "each side";
  if(eq.db && eq.db.each) return "two dumbbells";
  if(eq.kb && eq.kb.each && eq.kb.count==="Two kettlebells") return "two kettlebells";
  return "";
}
// Bar weight: Smith machine / barbell can add the bar to the weight you enter (plates only).
const LOAD_OPTS = ["Plates only (bar added)","Total, including bar"];
const loadModeOf = (k, o) => (o && o.load) || (k==="smith" ? LOAD_OPTS[0] : LOAD_OPTS[1]);
function barAddRaw(eq){
  if(!eq) return 0;
  for(const k of ["smith","barbell"]){ const o = eq[k], b = o ? parseFloat(o.bar) : 0; if(b>0 && loadModeOf(k,o)===LOAD_OPTS[0]) return b; }
  return 0;
}
const totalRaw = e => (e.weight||0) + barAddRaw(e.equip);   // in the entry's own unit
const loadOf = e => toUnit(totalRaw(e), e.unit);               // in the display unit
let failSets = new Set(), failN = 0;
function renderFailChips(){
  const n = Math.max(1, Math.min(20, parseInt($("#sets").value,10)||1));
  if(n===failN && $("#fail-chips").childElementCount===n) return;
  failN = n; [...failSets].forEach(i=>{ if(i>=n) failSets.delete(i); });
  $("#fail-chips").innerHTML = Array.from({length:n},(_,i)=>`<button type="button" class="fchip" data-fset="${i}" aria-pressed="${failSets.has(i)}" aria-label="Set ${i+1} taken to failure">${i+1}</button>`).join("");
}
// Reps left in the tank (RIR), optional and the same for every set logged together. Tap again to clear.
let rirPick = null;
const rirText = r => r==null ? "" : `${r>=4?"4+":r} left · RPE ${r>=4?"6 or less":10-r}`;
function renderRir(){ document.querySelectorAll("#rir-chips [data-rir]").forEach(b=>b.setAttribute("aria-pressed", String(+b.dataset.rir===rirPick))); }
// ---------- plate calculator: plates per side for a barbell or Smith machine ----------
const PLATES = {lb:[45,35,25,10,5,2.5], kg:[25,20,15,10,5,2.5,1.25]};
// Bumper-plate colors: kg 25 red, 20 blue, 15 yellow, 10 green; lb 45 blue, 35 yellow, 25 green.
const PLATE_COLOR = {lb:{45:"blue",35:"yellow",25:"green"}, kg:{25:"red",20:"blue",15:"yellow",10:"green"}};
function platesFor(perSide, unit){
  const out = []; let left = Math.round(perSide*100)/100;
  PLATES[unit].forEach(p=>{ while(left>=p){ out.push(p); left = Math.round((left-p)*100)/100; } });
  return {plates:out, left};
}
function renderPlates(){
  const el = $("#plates"), eq = equipField().equip || {}, unit = prefs.unit, w = parseFloat($("#weight").value)||0;
  const k = eq.barbell ? "barbell" : eq.smith ? "smith" : null;
  if(!k || mode!=="straight" || isCardioForm() || w<=0){ el.hidden = true; return; }
  el.hidden = false;
  const o = eq[k];
  let perSide = w/2, barNote = "";
  if(loadModeOf(k,o)!==LOAD_OPTS[0]){   // the weight includes the bar
    let bar = o.bar;
    if(!(bar>=0)){
      if(k!=="barbell" || (o.type && o.type!=="Straight bar")){ el.innerHTML = "Add the bar weight under Equipment to see plates per side."; return; }
      bar = unit==="kg" ? 20 : 45; barNote = ` (${bar} ${unit} bar)`;
    }
    perSide = (w-bar)/2;
  }
  if(perSide<=0){ el.innerHTML = "Just the bar"; return; }
  const r = platesFor(perSide, unit);
  el.innerHTML = `<span>Per side${barNote}:</span>` + r.plates.map(p=>`<span class="plate ${PLATE_COLOR[unit][p]||""}">${fmt(p)}</span>`).join("") +
    (r.left>0 ? `<span class="pl-left">${fmt(r.left*2)} ${unit} under</span>` : "");
}
function weightLabel(){ return isBWForm() ? "Added weight" : barAddRaw(equipField().equip)>0 ? "Plates" : "Weight"; }
const volOf = e => loadOf(e) * e.reps * loadMult(e.equip);
// ---------- exercise how-to hints & lateral raise details ----------
const EX_INFO = [
  [/\b21s\b/, "One set = 21 reps: 7 from the bottom to halfway up, 7 from halfway to the top, then 7 full reps. Log 21 reps per set."],
  [/^single-arm crossbody cable triceps extension$/, "High pulley, D grip in the opposite hand. Start with the handle by the opposite shoulder, then straighten your arm down and out to your side, finishing at waist height. Mainly triceps, with some rear and side delt."],
  [/^crossbody cable triceps extension$/, "Two high pulleys, cables crossed in front of your chest. Push both handles diagonally down and out until your arms are straight."],
  [/scaption/, "Raise your arms about 30° forward of straight out to the sides (the scapular plane), thumbs up, to about shoulder height."],
  [/lateral raise/, "Record grip, arm path and position under Lateral raise details to track the variation and which part of the delts it emphasizes."],
];
const LR = {grip:["Palms down","Thumbs up","Pinky slightly up","Palms facing in"],
  path:["Straight out to the sides","Scapular plane (~30° forward)","In front of the body","Slightly behind the body"],
  pos:["Standing upright","Leaning away (holding a support)","Seated","Chest-supported or bent over"]};
function lrEmphasis(v){
  if(!v || !(v.grip||v.path||v.pos)) return "";
  const s = {front:0, side:0, rear:0};
  const p = v.path||"Straight out to the sides";
  if(p.startsWith("Straight")) s.side+=2;
  else if(p.startsWith("Scapular")){ s.side+=1.5; s.front+=1; }
  else if(p.startsWith("In front")){ s.front+=2; s.side+=0.5; }
  else if(p.startsWith("Slightly behind")){ s.side+=1.5; s.rear+=1; }
  if(v.grip==="Thumbs up") s.front+=1;
  if(v.grip==="Pinky slightly up"){ s.side+=0.5; s.rear+=0.5; }
  if(v.grip==="Palms facing in") s.front+=0.5;
  if(v.pos==="Chest-supported or bent over") s.rear+=2;
  const max = Math.max(s.front, s.side, s.rear);
  return ["side","front","rear"].filter(k=>s[k]>0 && s[k]>=max*0.6).sort((a,b)=>s[b]-s[a]).map(k=>`${k} delts`).join(" & ");
}
const variantText = e => e.variant ? [e.variant.grip, e.variant.path, e.variant.pos].filter(Boolean).join(" · ") + (lrEmphasis(e.variant) ? ` → mostly ${lrEmphasis(e.variant)}` : "") : "";
function readVariant(){ const v={}; ["grip","path","pos"].forEach(k=>{ const x=$("#lr-"+k).value; if(x) v[k]=x; }); return v; }
const variantField = () => { if($("#variant-wrap").hidden) return {}; const v = readVariant(); return Object.keys(v).length ? {variant:v} : {}; };
function updateLrEmph(){
  if($("#variant-wrap").hidden) return;
  const v = readVariant(), em = lrEmphasis(v);
  $("#lr-emph").textContent = em ? `Emphasis (approximate): mostly ${em}.` + (v.grip==="Pinky slightly up" ? " Pinky-up raises bother some people's shoulders; skip them if they pinch." : "") : "Pick any of these to see which part of the delts the variation emphasizes.";
}
let extrasFor = null;
function refreshExerciseExtras(){
  const name = $("#exercise").value.trim(), l = name.toLowerCase(), cardio = isCardioForm(), key = l+"|"+cardio;
  if(key===extrasFor){ updateLrEmph(); return; }
  extrasFor = key;
  const info = name ? (EX_INFO.find(([re])=>re.test(l))||[])[1] : null;
  $("#ex-hint").hidden = !info; $("#ex-hint").textContent = info||"";
  const lr = !cardio && /lateral raise/.test(l);
  $("#variant-wrap").hidden = !lr;
  if(lr){ const last = sorted().reverse().find(e=>e.exercise.toLowerCase()===l && e.variant), v = (last&&last.variant)||{};
    ["grip","path","pos"].forEach(k=>$("#lr-"+k).value = v[k]||""); }
  updateLrEmph();
}

function updateVolPreview(){
  refreshExerciseExtras(); renderPlates();
  if(typeof updateEquipSummary==="function") updateEquipSummary();
  const el = $("#vol-preview"); if(!el) return;
  if(!isCardioForm()){ $("#w-label").textContent = weightLabel(); const dh = document.querySelector("#drop-rows .drop-head span:nth-child(2)"); if(dh) dh.textContent = `${weightLabel().replace(" weight","")} (${prefs.unit})`; }
  renderFailChips();
  if(isCardioForm() || !$("#exercise").value.trim()){ el.textContent = ""; return; }
  const eq = (equipField().equip) || null, m = loadMult(eq), why = multReason(eq), u = prefs.unit, bar = barAddRaw(eq);
  const mtxt = m>1 ? ` × 2 (${why})` : "";
  if(mode==="drop"){
    readDropRows();
    const rows = dropRows.map(r=>({w:(parseFloat(r.weight)||0)+bar, r:parseInt(r.reps,10)||0}));
    const tot = rows.reduce((a,x)=>a+x.w*x.r,0)*m;
    el.textContent = isBWForm() && !tot ? "Bodyweight only: counts reps, not pounds." :
      `Counts toward volume: ${m>1&&rows.length>1?"(":""}${rows.map(x=>`${fmt(x.w)}×${x.r}`).join(" + ")}${m>1&&rows.length>1?")":""}${mtxt} = ${Math.round(tot).toLocaleString()} ${u}${bar?` (each includes the ${fmt(bar)} ${u} bar)`:""}`;
    return;
  }
  const w = parseFloat($("#weight").value)||0, r = parseInt($("#reps").value,10)||0, n = parseInt($("#sets").value,10)||1;
  if(isBWForm() && !w){ el.textContent = "Bodyweight only: counts reps, not pounds."; return; }
  el.textContent = `Counts toward volume: ${bar?`(${fmt(w)} plates + ${fmt(bar)} bar) `:`${fmt(w)} `}${u} × ${r} reps × ${n} set${n===1?"":"s"}${mtxt} = ${Math.round((w+bar)*r*n*m).toLocaleString()} ${u}` +
    (m>1 && why==="each side" ? ". Log reps for one side; the other side is counted for you." : m>1 ? ". Enter the weight of one." : "");
}
// Setters for values other files change.
function setMode(v){ mode = v; }
function setDropRows(v){ dropRows = v; }
function setDropPicked(v){ dropPicked = v; }
function setFailSets(v){ failSets = v; }
function setFailN(v){ failN = v; }
function setRirPick(v){ rirPick = v; }

export function init(){
  document.querySelectorAll(".unit-toggle button").forEach(b=>b.onclick=()=>{
    if(prefs.unit===b.dataset.unit) return;
    const w = parseFloat($("#weight").value)||0;
    const old = prefs.unit; prefs.unit=b.dataset.unit; savePrefs(); applyUnit();
    $("#weight").value = fmt(toUnit(w, old));
    Object.values(equipState).forEach(st=>{ const n=parseFloat(st.vals && st.vals.bar); if(n>=0) st.vals.bar=fmt(toUnit(n,old)); });
    renderEquipFields();
    if(isCardioForm()){ const v=readCardioVals(); renderCardioDetails(cardioTypeOf($("#exercise").value), v); }
    { const b=parseFloat($("#bw-today").value); if(b>0) $("#bw-today").value = fmt(toUnit(b, old)); }
    readDropRows(); dropRows = dropRows.map(r=>({weight:fmt(toUnit(parseFloat(r.weight)||0, old)), reps:r.reps})); dropPicked = false; if(mode==="drop") renderDropRows();
    renderQuick(); renderAll();
  });

  // ---------- tabs ----------
  document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("nav.tabs button").forEach(x=>x.setAttribute("aria-selected", String(x===b)));
    ["log","plan","history","progress"].forEach(t=> $("#tab-"+t).hidden = t!==b.dataset.tab);
    window.scrollTo(0,0);
    renderHead();
    if(b.dataset.tab==="plan") renderPlan();
    if(b.dataset.tab==="progress") renderProgress();
  });

  // ---------- log form ----------
  $("#date").value = today();
  document.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{
    const f = b.dataset.step, dir = +b.dataset.dir, el = $("#"+f);
    const step = f==="weight" ? (prefs.unit==="kg"?2.5:5) : 1;
    const min = f==="weight"?0:1;
    el.value = fmt(Math.max(min, (parseFloat(el.value)||0) + dir*step));
  });
  $("#quick-add").addEventListener("click", e=>{
    const b = e.target.closest("[data-quick]"); if(!b) return;
    $("#weight").value = String(Math.round(((parseFloat($("#weight").value)||0) + (+b.dataset.quick))*100)/100);
    updateVolPreview();
  });
  $("#note-toggle").onclick = ()=>{
    const w=$("#note-wrap"); w.hidden=!w.hidden;
    $("#note-toggle").setAttribute("aria-expanded", String(!w.hidden));
    if(!w.hidden) $("#note").focus();
  };
  $("#drop-step").addEventListener("change", e=>{ dropStep = +e.target.value; dropPicked = true; });
  $("#drop-rows").addEventListener("click", e=>{
    const b = e.target.closest("[data-dstep]"); if(!b) return;
    const isW = b.dataset.dstep==="w";
    const input = b.parentElement.querySelector("input");
    const step = isW ? stepSize() : 1, min = isW ? 0 : 1;
    input.value = fmt(Math.max(min, (parseFloat(input.value)||0) + (+b.dataset.dir)*step));
    input.dispatchEvent(new Event("change", {bubbles:true}));
  });

  $("#drop-rows").addEventListener("input", readDropRows);
  $("#drop-rows").addEventListener("change", readDropRows);
  $("#drop-rows").addEventListener("click", e=>{
    const b = e.target.closest("[data-dfail]"); if(!b) return;
    readDropRows(); const r = dropRows[+b.dataset.dfail]; r.fail = !r.fail; renderDropRows();
    const nb = document.querySelector(`#drop-rows [data-dfail="${b.dataset.dfail}"]`); if(nb) nb.focus();
  });
  $("#drop-rows").addEventListener("click", e=>{
    const b=e.target.closest("[data-rm]"); if(!b) return;
    readDropRows(); dropRows.splice(+b.dataset.rm,1); renderDropRows();
  });
  $("#add-same").onclick = ()=>addDropRow(0);
  $("#add-up").onclick = ()=>addDropRow(1);
  $("#add-down").onclick = ()=>addDropRow(-1);
  document.querySelectorAll(".mode button").forEach(b=>b.onclick=()=>{
    mode=b.dataset.mode;
    document.querySelectorAll(".mode button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
    $("#drop-wrap").hidden = mode!=="drop";
    $("#straight-wrap").hidden = mode==="drop";
    $("#save").textContent = mode==="drop" ? "Log drop set" : "Log set";
    applyFormKind();
    if(mode==="drop" && !dropRows.length){ dropRows=[{weight:$("#weight").value, reps:$("#reps").value}]; }
    if(mode==="drop") renderDropRows();
  });
  $("#exercise").addEventListener("change", e=>{ if(lastFor(e.target.value)) prefill(e.target.value); });

  $("#save").onclick = async ()=>{
    unlockAudio();
    const exercise = $("#exercise").value.trim().replace(/\s+/g," ");
    if(isCardioForm()) return saveCardio(exercise);
    if(mode==="drop") return saveDrop(exercise);
    const weight = parseFloat($("#weight").value);
    const reps = parseInt($("#reps").value,10);
    const sets = parseInt($("#sets").value,10);
    const date = $("#date").value || today();
    if(!exercise){ flash($("#new-ex-wrap").hidden ? "Choose an exercise, or add a new one." : "Enter a name for the new exercise.", true); ($("#new-ex-wrap").hidden ? $("#exercise-search") : $("#exercise")).focus(); return; }
    if(!(weight>=0)){ flash("Enter a weight of 0 or more.", true); return; }
    if(!(reps>=1)){ flash("Reps must be at least 1.", true); return; }
    if(!(sets>=1 && sets<=50)){ flash("Sets must be between 1 and 50.", true); return; }
    // match existing capitalization
    const existing = exercisesByRecent().find(n=>n.toLowerCase()===exercise.toLowerCase());
    const name = existing || exercise;
    const note = $("#note").value.trim();
    const base = Date.now(), ssf = supersetFields(date);
    const list = Array.from({length:sets},(_,i)=>({id:uid(), date, exercise:name, weight, unit:prefs.unit, reps, sets:1, note, muscle: $("#muscle").value, ...equipField(), ...bwFields(), ...variantField(), ...ssf, ts:base+i, ...(failSets.has(i)?{failure:true}:{}), ...(rirPick!=null?{rir:rirPick}:{})}));
    rememberBodyWeight();
    const btn=$("#save"); btn.disabled=true;
    try{
      await store.add(list);
      flash(`Logged ${sets} × ${reps} @ ${fmt(weight)} ${prefs.unit} — ${name}`);
      if(supersetLogged(ssf, date, name) && date===today()) startRest();
      resetForm();
    }catch(e){ flash("Couldn't save that set. Try again.", true); }
    btn.disabled=false;
  };
  $("#ss-on").addEventListener("change", renderSuperset);
  $("#rir-chips").addEventListener("click", e=>{
    const b = e.target.closest("[data-rir]"); if(!b) return;
    rirPick = +b.dataset.rir===rirPick ? null : +b.dataset.rir; renderRir();
  });
  $("#fail-chips").addEventListener("click", e=>{
    const b = e.target.closest("[data-fset]"); if(!b) return;
    const i = +b.dataset.fset; failSets.has(i) ? failSets.delete(i) : failSets.add(i);
    b.setAttribute("aria-pressed", String(failSets.has(i)));
  });
  ["grip","path","pos"].forEach(k=>{ $("#lr-"+k).innerHTML = `<option value="">Not recorded</option>` + LR[k].map(o=>`<option>${o}</option>`).join(""); });
}

export { today, uid, toUnit, fmt, fmtBig, e1rm, niceDate, esc, sorted, exercisesByRecent, lastFor, css, flash, applyUnit, quickSteps, renderQuick, showLast, prefill, mode, dropRows, stepSize, roundStep, readDropRows, renderDropRows, dropStep, dropPicked, renderDropStep, addDropRow, ssOpen, supersetFields, supersetLogged, renderSuperset, supersetFor, loadMult, multReason, LOAD_OPTS, loadModeOf, barAddRaw, totalRaw, loadOf, failSets, failN, renderFailChips, rirPick, rirText, renderRir, PLATES, PLATE_COLOR, platesFor, renderPlates, weightLabel, volOf, EX_INFO, LR, lrEmphasis, variantText, readVariant, variantField, updateLrEmph, extrasFor, refreshExerciseExtras, updateVolPreview, setMode, setDropRows, setDropPicked, setFailSets, setFailN, setRirPick };
