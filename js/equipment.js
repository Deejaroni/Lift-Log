// Lift Log: Equipment toggles and the cardio form.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- equipment toggles ----------
// For an exercise you haven't logged yet, switch on the likely equipment from its name.
function suggestEquip(name){
  const n = (name||"").toLowerCase(), eq = {};
  if(/kettlebell|turkish get-up|renegade row/.test(n)) eq.kb = {count: /double/.test(n) ? "Two kettlebells" : "One kettlebell"};
  else if(BW_NAMES.has(n)) eq.bw = {};
  else if(/smith/.test(n)) eq.smith = {};
  else if(/plate-loaded|t-bar|hammer row|hammer-style|leverage|pendulum|hack squat|v-squat|belt squat|glute drive|leg press/.test(n)) eq.plate = {};
  else if(/cable|pushdown|face pull|straight-arm|lat pulldown|pulldown|pull-through|pallof|woodchop|cable chop/.test(n)){
    const a = /single-arm crossbody/.test(n) ? "D grip" : /rope/.test(n) ? "Rope pulldown" : /v-bar/.test(n) ? "V bar" : /straight.?bar|bar straight/.test(n) ? "Straight bar" : /ez/.test(n) ? "EZ bar" : null;
    eq.cable = a ? {attach:a} : {};
  }
  else if(/dumbbell|goblet|arnold|zottman|concentration|spider curl|hammer curl|farmer|suitcase/.test(n)) eq.db = {};
  else if(/machine|pec deck|selectorized|iso-lateral|converging|chest press|seated row|reverse pec|leg curl|lying curl|seated curl|leg extension|single-leg extension|calf raise|abduction|ab crunch|preacher curl/.test(n)) eq.pin = {};
  else if(/barbell|ez-bar|bench press|deadlift|\brdl\b|squat|pendlay|yates|seal row|snatch|good morning|overhead press|skull crusher|drag curl|shrug|hip thrust|glute bridge/.test(n))
    eq.barbell = /ez-bar/.test(n) ? {type:"EZ bar"} : /trap bar/.test(n) ? {type:"Trap bar"} : {type:"Straight bar"};
  const key = Object.keys(eq)[0];
  if(key && key!=="barbell" && key!=="bw"){
    if(/single-arm|single-leg|one-arm|one-leg|unilateral|single arm|single leg/.test(n)) eq[key].side = "One side (unilateral)";
    else eq[key].side = "Both sides";
  }
  return eq;
}
const EQUIP = [
  {key:"smith",   label:"Smith machine",    fields:[{k:"bar",label:"Bar weight",num:true},{k:"load",label:"Weight you enter",options:LOAD_OPTS},{k:"brand",label:"Brand",brand:true},{k:"side",label:"Arms / legs",options:["Both sides","One side (unilateral)"]}]},
  {key:"barbell", label:"Barbell",          fields:[{k:"type",label:"Bar type",options:["Straight bar","EZ bar","Trap bar"]},{k:"bar",label:"Bar weight",num:true},{k:"load",label:"Weight you enter",options:LOAD_OPTS}]},
  {key:"cable",   label:"Cable machine",    fields:[{k:"brand",label:"Brand",brand:true},{k:"attach",label:"Attachment",options:["D grip","MAG grip","Rope pulldown","Long single rope","V bar","Close-grip V handle","Straight bar","EZ bar","Elbow strap","Wrist cuff","Ankle cuff"]},{k:"side",label:"Arms / legs",options:["Both sides","One side (unilateral)"]}]},
  {key:"pin",     label:"Pin-select machine",fields:[{k:"brand",label:"Brand",brand:true},{k:"seat",label:"Seat / setting",ph:"Seat 4, pad 2"},{k:"side",label:"Arms / legs",options:["Both sides","One side (unilateral)"]}]},
  {key:"plate",   label:"Plate-loaded machine",fields:[{k:"brand",label:"Brand",brand:true},{k:"seat",label:"Seat / setting",ph:"Seat 3"},{k:"side",label:"Arms / legs",options:["Both sides","One side (unilateral)"]}]},
  {key:"db",      label:"Dumbbells",        fields:[{k:"side",label:"Arms / legs",options:["Both sides","One side (unilateral)"]},{k:"each",label:"Weight is per hand",check:true}]},
  {key:"kb",      label:"Kettlebell",       fields:[{k:"count",label:"Bells",options:["One kettlebell","Two kettlebells"]},{k:"side",label:"Arms / legs",options:["Both sides","One side (unilateral)"]},{k:"each",label:"Weight is per bell",check:true}]},
  {key:"bw",      label:"Bodyweight",       fields:[], info:"The weight box now means added weight (vest, belt or held weight). Leave it at 0 for plain bodyweight. Your body weight for the day is used for calories."},
  {key:"band",    label:"Band / assist",    fields:[{k:"level",label:"Band color or level",ph:"Red, heavy"},{k:"side",label:"Arms / legs",options:["Both sides","One side (unilateral)"]}]},
];
let equipState = {};
function renderEquipToggles(){
  $("#equip-toggles").innerHTML = EQUIP.map(q=>`<label class="tog"><input type="checkbox" role="switch" data-eq="${q.key}" ${equipState[q.key]?.on?"checked":""}><span class="sw" aria-hidden="true"></span>${q.label}</label>`).join("");
}
function renderEquipFields(){
  $("#equip-fields").innerHTML = EQUIP.filter(q=>equipState[q.key]?.on).map(q=>{
    const v = equipState[q.key].vals||{};
    const f = q.fields.map(fd=>{
      const id = `eq-${q.key}-${fd.k}`;
      if(fd.check) return `<label class="check"><input type="checkbox" id="${id}" data-eqk="${q.key}" data-eqf="${fd.k}" ${v[fd.k]?"checked":""}> ${fd.label}</label>`;
      if(fd.options){
        const opts = fd.options.slice(); if(v[fd.k] && !opts.includes(v[fd.k])) opts.push(v[fd.k]);
        return `<div><label class="lbl" for="${id}">${fd.label}</label><select id="${id}" data-eqk="${q.key}" data-eqf="${fd.k}"><option value="">Select…</option>${opts.map(o=>`<option ${o===v[fd.k]?"selected":""}>${esc(o)}</option>`).join("")}</select></div>`;
      }
      const lbl = fd.num ? `${fd.label} (${prefs.unit})` : fd.label;
      return `<div><label class="lbl" for="${id}">${lbl}</label><input id="${id}" type="${fd.num?"number":"text"}" ${fd.num?'inputmode="decimal" min="0" step="any"':""} ${fd.brand?'list="brand-list" autocomplete="off"':""} placeholder="${esc(fd.ph||"")}" data-eqk="${q.key}" data-eqf="${fd.k}" value="${esc(v[fd.k]??"")}"></div>`;
    }).join("");
    if(!q.fields.length) return `<div class="eq-fields"><h4>${q.label}</h4><p class="cal-sub" style="margin:0">${q.info||""}</p></div>`;
    return `<div class="eq-fields"><h4>${q.label}</h4><div class="eq-grid">${f}</div></div>`;
  }).join("");
}
$("#equip-toggles").addEventListener("change", e=>{
  const k = e.target.dataset.eq; if(!k) return;
  equipState[k] = equipState[k] || {vals:{}};
  equipState[k].on = e.target.checked;
  if((k==="smith"||k==="barbell") && !equipState[k].vals.load) equipState[k].vals.load = loadModeOf(k, null);
  renderEquipFields(); updateBWForm();
  if(e.target.checked){ const f=document.querySelector(`#equip-fields [data-eqk="${k}"]`); if(f) f.focus(); }
});
$("#equip-fields").addEventListener("input", e=>{
  const k=e.target.dataset.eqk, f=e.target.dataset.eqf; if(!k) return;
  equipState[k].vals[f] = e.target.type==="checkbox" ? e.target.checked : e.target.value;
});
function equipField(){
  const out = {};
  EQUIP.forEach(q=>{
    const st = equipState[q.key]; if(!st || !st.on) return;
    const o = {};
    q.fields.forEach(fd=>{
      const v = st.vals[fd.k];
      if(fd.check){ if(v) o[fd.k]=true; }
      else if(fd.num){ const n=parseFloat(v); if(n>=0) o[fd.k]=n; }
      else if(v && String(v).trim()) o[fd.k]=String(v).trim();
    });
    out[q.key]=o;
  });
  return Object.keys(out).length ? {equip:out} : {};
}
function applyEquip(eq, unit){
  equipState = {};
  Object.entries(eq||{}).forEach(([k,o])=>{
    const vals = Object.assign({}, o);
    if(typeof vals.bar==="number") vals.bar = fmt(toUnit(vals.bar, unit));
    if((k==="smith"||k==="barbell") && !vals.load) vals.load = loadModeOf(k, null);
    equipState[k] = {on:true, vals};
  });
  renderEquipToggles(); renderEquipFields();
  if(typeof updateBWForm==="function") updateBWForm();
}
function equipText(e){
  if(!e.equip) return "";
  return EQUIP.filter(q=>e.equip[q.key]).map(q=>{
    const o=e.equip[q.key], parts=[];
    if(o.type) parts.push(o.type);
    if(o.brand) parts.push(o.brand);
    if(typeof o.bar==="number") parts.push(`${fmt(toUnit(o.bar,e.unit))} ${prefs.unit} bar${(q.key==="smith"||q.key==="barbell") ? (loadModeOf(q.key,o)===LOAD_OPTS[0] ? " added" : " included") : ""}`);
    if(o.count) parts.push(o.count.toLowerCase());
    if(o.attach) parts.push(o.attach);
    if(o.side) parts.push(o.side==="Both sides" ? "both sides" : "one side");
    if(o.seat) parts.push(o.seat);
    if(o.level) parts.push(o.level);
    if(o.each) parts.push("per hand");
    return q.label + (parts.length?": "+parts.join(", "):"");
  }).join(" · ");
}
function renderBrandList(){
  const b = new Set();
  entries.forEach(e=>Object.values(e.equip||{}).forEach(o=>{ if(o.brand) b.add(o.brand); }));
  $("#brand-list").innerHTML = [...b].sort().map(x=>`<option value="${esc(x)}">`).join("");
}
renderEquipToggles();

// ---------- cardio ----------
const isCardio = e => e.kind==="cardio" || e.kind==="mobility"; // any timed (non-lifting) entry
const isMob = e => e.kind==="mobility";
const CARDIO_MET = { // approximate published activity ratings (MET) by effort
  treadmill:{easy:3.5, moderate:7.0, hard:9.8}, walk:{easy:2.8, moderate:3.5, hard:4.3}, run:{easy:7.0, moderate:9.8, hard:11.5},
  hike:{easy:5.3, moderate:6.0, hard:7.8}, ruck:{easy:5.0, moderate:6.5, hard:8.0}, bike:{easy:5.5, moderate:6.8, hard:8.8},
  airbike:{easy:5.5, moderate:7.5, hard:10.0}, rower:{easy:4.8, moderate:7.0, hard:8.5}, skierg:{easy:4.8, moderate:7.0, hard:8.5},
  elliptical:{easy:4.0, moderate:5.0, hard:7.0}, stair:{easy:6.0, moderate:8.0, hard:9.0}, swim:{easy:5.8, moderate:8.3, hard:9.8},
  jumprope:{easy:8.8, moderate:11.8, hard:12.3}, mobility:{easy:2.3, moderate:2.5, hard:3.0}, hiit:{easy:4.3, moderate:6.0, hard:8.0}, other:{easy:4.0, moderate:5.5, hard:7.0}
};
const CARDIO_FIELDS = {
  treadmill:[{k:"speed",label:()=>`Speed (${spdU()})`},{k:"incline",label:()=>"Incline (%)"}],
  bike:[{k:"level",label:()=>"Resistance level"},{k:"watts",label:()=>"Avg watts"},{k:"rpm",label:()=>"Avg RPM"}],
  airbike:[{k:"level",label:()=>"Resistance level"},{k:"watts",label:()=>"Avg watts"},{k:"rpm",label:()=>"Avg RPM"}],
  rower:[{k:"split",label:()=>"Avg split /500 m",text:true,ph:"2:05"},{k:"watts",label:()=>"Avg watts"},{k:"spm",label:()=>"Stroke rate (spm)"}],
  skierg:[{k:"split",label:()=>"Avg split /500 m",text:true,ph:"2:10"},{k:"watts",label:()=>"Avg watts"},{k:"spm",label:()=>"Stroke rate (spm)"}],
  stair:[{k:"level",label:()=>"Level"},{k:"floors",label:()=>"Floors climbed"}],
  elliptical:[{k:"level",label:()=>"Level"},{k:"incline",label:()=>"Incline"}],
  hiit:[{k:"rounds",label:()=>"Rounds"},{k:"work",label:()=>"Work (sec)"},{k:"rest",label:()=>"Rest (sec)"}],
};
const spdU = ()=> prefs.unit==="kg" ? "km/h" : "mph";
const guessCardioType = name => { const n=(name||"").toLowerCase();
  return /treadmill/.test(n)?"treadmill": /air ?bike|assault|echo bike/.test(n)?"airbike": /bike|cycl|spin/.test(n)?"bike": /row/.test(n)?"rower": /ski/.test(n)?"skierg":
    /stair|stepmill|step mill/.test(n)?"stair": /elliptical|cross.?trainer/.test(n)?"elliptical": /swim/.test(n)?"swim": /jump ?rope|skipping/.test(n)?"jumprope":
    /hiit|interval|circuit|tabata/.test(n)?"hiit": /ruck/.test(n)?"ruck": /hike/.test(n)?"hike": /run|jog|sprint/.test(n)?"run": /walk/.test(n)?"walk":"other"; };
const cardioTypeOf = name => CARDIO_TYPE.get((name||"").toLowerCase()) || guessCardioType(name);
const distUnitFor = t => (t==="rower"||t==="skierg") ? "m" : t==="swim" ? (prefs.unit==="kg"?"m":"yd") : (prefs.unit==="kg"?"km":"mi");
const toMeters = (d,u) => u==="mi"? d*1609.344 : u==="km"? d*1000 : u==="yd"? d*0.9144 : d;
const distStep = u => u==="m" ? 250 : u==="yd" ? 50 : 0.25;
const fmtMin = m => { const r=Math.round(m*10)/10; if(r<60) return `${fmt(r)} min`; const h=Math.floor(r/60), mm=Math.round(r-h*60); return `${h} h ${String(mm).padStart(2,"0")} min`; };
const mmss = sec => { sec=Math.round(sec); return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`; };
const parseSplit = v => { v=String(v||"").trim(); if(!v) return null; const m=v.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/); if(m) return (+m[1])*60+(+m[2]); const n=parseFloat(v); return n>0? n : null; };
let effort = "moderate";
function isCardioForm(){ return TIMED.has($("#muscle").value); }
const isMobForm = () => $("#muscle").value==="Mobility";
const isBWForm = () => !isCardioForm() && !!(equipState.bw && equipState.bw.on);
function updateBWForm(){
  const on = isBWForm();
  $("#bw-today-wrap").hidden = !on;
  $("#w-label").textContent = weightLabel();
  $("#bw-today-unit").textContent = prefs.unit;
  const inp = $("#bw-today");
  if(document.activeElement!==inp){ const r = bwEntryOn($("#date").value||today()); inp.value = r ? fmt(toUnit(r.w, r.unit)) : ""; }
  if(mode==="drop" && !$("#drop-wrap").hidden){ readDropRows(); renderDropRows(); }
}
function rememberBodyWeight(){
  if(!isBWForm()) return null;
  const n = parseFloat($("#bw-today").value); if(!(n>0)) return null;
  const date = $("#date").value||today(), r = bwEntryOn(date);
  if(!r || r.date!==date || Math.abs(toUnit(r.w,r.unit)-n)>0.01){ recordBW(date, n); saveSettings(); }
  return n;
}
const bwFields = () => { if(!isBWForm()) return {}; const n=parseFloat($("#bw-today").value); return n>0 ? {bodyWeight:n, bodyWeightUnit:prefs.unit} : {}; };
function applyFormKind(){
  const c = isCardioForm();
  $("#cardio-wrap").hidden = !c;
  document.querySelector(".mode").hidden = c;
  document.querySelector(".equip").hidden = c;
  $("#drop-wrap").hidden = c || mode!=="drop";
  $("#straight-wrap").hidden = c || mode==="drop";
  $("#fail-row").hidden = $("#rir-row").hidden = c || mode==="drop";
  $("#ss-row").hidden = c;
  $("#save").textContent = c ? (isMobForm() ? "Log mobility" : "Log cardio") : (mode==="drop" ? "Log drop set" : "Log set");
  $("#c-dist-box").hidden = isMobForm(); $("#cardio-details").hidden = isMobForm();
  $("#cardio-wrap .steppers").classList.toggle("c2", !isMobForm());
  if(c && !$("#cardio-details").dataset.type) renderCardioDetails(cardioTypeOf($("#exercise").value), {});
  updateBWForm();
  updateVolPreview();
}
function setEffort(v){ effort = v||"moderate"; document.querySelectorAll("#effort-seg button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.effort===effort))); }
document.querySelectorAll("#effort-seg button").forEach(b=>b.onclick=()=>setEffort(b.dataset.effort));
function renderCardioDetails(type, v){
  v = v || {};
  $("#cardio-details").dataset.type = type;
  $("#c-dist-unit").textContent = distUnitFor(type);
  const fields = (CARDIO_FIELDS[type]||[]).map(f=>`<div><label class="lbl" for="cx-${f.k}">${f.label()}</label><input id="cx-${f.k}" data-cx="${f.k}" type="${f.text?"text":"number"}" ${f.text?'inputmode="numeric"':'inputmode="decimal" min="0" step="any"'} placeholder="${esc(f.ph||"")}" value="${esc(v[f.k]??"")}"></div>`).join("");
  $("#cardio-details").innerHTML = `<div class="eq-fields" style="border-left-color:var(--blue)"><h4>Details <span class="cal-sub" style="font-family:Archivo,sans-serif;font-stretch:100%;font-size:.8rem">(all optional)</span></h4><div class="eq-grid">
    ${fields}
    <div><label class="lbl" for="cx-hr">Avg heart rate (bpm)</label><input id="cx-hr" data-cx="hr" type="number" inputmode="numeric" min="0" step="1" value="${esc(v.hr??"")}"></div>
    <div><label class="lbl" for="cx-mk">Machine / watch calories</label><input id="cx-mk" data-cx="mk" type="number" inputmode="numeric" min="0" step="1" value="${esc(v.mk??"")}"></div>
  </div><label class="check"><input type="checkbox" id="cx-use" ${v.use?"checked":""}> Count the machine's calories in my totals instead of the app's estimate</label></div>`;
}
function readCardioVals(){
  const v = {}; document.querySelectorAll("#cardio-details [data-cx]").forEach(i=>{ v[i.dataset.cx]=i.value; });
  v.use = $("#cx-use") ? $("#cx-use").checked : false; return v;
}
function prefillCardio(name){
  const type = cardioTypeOf(name);
  const last = sorted().reverse().find(e=>isCardio(e) && e.exercise.toLowerCase()===(name||"").toLowerCase());
  if(!last){ $("#c-min").value = 30; $("#c-dist").value = ""; setEffort("moderate"); renderCardioDetails(type, {}); return; }
  $("#c-min").value = fmt(last.minutes);
  const du = distUnitFor(type);
  $("#c-dist").value = last.distance>0 ? fmt(Math.round(toMeters(last.distance,last.distUnit)/toMeters(1,du)*100)/100) : "";
  setEffort(last.effort);
  const x = Object.assign({}, last.extra||{});
  if(x.speed>0 && x.speedUnit && x.speedUnit!==(prefs.unit==="kg"?"kmh":"mph")) x.speed = fmt(x.speedUnit==="mph" ? x.speed*1.609344 : x.speed/1.609344);
  if(x.splitSec>0) x.split = mmss(x.splitSec);
  renderCardioDetails(type, Object.assign(x, {hr:last.hr||"", mk:"", use:false}));
}
$("#cardio-wrap").addEventListener("click", e=>{
  const b = e.target.closest("[data-cstep]"); if(!b) return;
  const isMin = b.dataset.cstep==="min", input = isMin ? $("#c-min") : $("#c-dist");
  const step = isMin ? 5 : distStep($("#c-dist-unit").textContent);
  input.value = fmt(Math.max(0, (parseFloat(input.value)||0) + (+b.dataset.dir)*step));
});
function cardioKcal(e){
  const T = e.kind==="mobility" ? "mobility" : cardioTypeOf(e.exercise), mins = e.minutes, x = e.extra||{};
  if(!(mins>0)) return null;
  let watts = x.watts>0 ? x.watts : null;
  if(!watts && (T==="rower"||T==="skierg")){
    const split = x.splitSec>0 ? x.splitSec : (e.distance>0 ? mins*60/(toMeters(e.distance,e.distUnit)/500) : null);
    if(split>0) watts = 2.80/Math.pow(split/500,3);   // Concept2 pace-to-watts formula
  }
  if(watts) return {kcal: watts*mins*60/1000, method:"from watts"};   // ~1 kcal burned per kJ of work
  const kg = bwKgOn(e.date);
  if(!kg) return null;
  if(T==="treadmill"||T==="walk"||T==="run"){
    let mpm = null;
    if(x.speed>0) mpm = x.speedUnit==="kmh" ? x.speed*1000/60 : x.speed*1609.344/60;
    else if(e.distance>0) mpm = toMeters(e.distance,e.distUnit)/mins;
    if(mpm>=20 && mpm<=450){
      const G = (x.incline||0)/100, walking = T==="walk" || (T==="treadmill" && mpm<107);
      const vo2 = walking ? 3.5 + 0.1*mpm + 1.8*mpm*G : 3.5 + 0.2*mpm + 0.9*mpm*G;   // ACSM equations
      return {kcal: vo2*kg/1000*5*mins, method: G ? "from speed & incline" : "from speed"};
    }
  }
  const met = (CARDIO_MET[T]||CARDIO_MET.other)[e.effort||"moderate"];
  return {kcal: met*kg*mins/60, method:"from effort"};
}
const countedKcal = e => (e.useMachine && e.machineKcal>0) ? e.machineKcal : (cardioKcal(e)?.kcal ?? null);
function paceText(e){
  const T = cardioTypeOf(e.exercise), x=e.extra||{};
  if(T==="rower"||T==="skierg"){ const sp = x.splitSec>0 ? x.splitSec : (e.distance>0 ? e.minutes*60/(toMeters(e.distance,e.distUnit)/500) : 0); return sp ? `${mmss(sp)} /500 m` : ""; }
  if(!(e.distance>0) || !(e.minutes>0)) return "";
  if(T==="swim"){ const u = e.distUnit==="m"?"m":"yd"; return `${mmss(e.minutes*60/(toMeters(e.distance,e.distUnit)/toMeters(100,u)))} /100 ${u}`; }
  const du = prefs.unit==="kg"?"km":"mi", d = toMeters(e.distance,e.distUnit)/toMeters(1,du);
  if(T==="bike"||T==="airbike") return `${fmt(d/(e.minutes/60))} ${du==="km"?"km/h":"mph"}`;
  return `${mmss(e.minutes*60/d)} /${du}`;
}
const distText = e => e.distance>0 ? `${fmt(e.distance)} ${e.distUnit}` : "";
function cardioRow(e){
  if(editing===e.id) return editCardioHTML(e);
  const x=e.extra||{}, bits=[];
  if(x.speed>0) bits.push(`${fmt(x.speed)} ${x.speedUnit==="kmh"?"km/h":"mph"}`);
  if(x.incline>0) bits.push(`${fmt(x.incline)}% incline`);
  if(x.level>0) bits.push(`Level ${fmt(x.level)}`);
  if(x.watts>0) bits.push(`${Math.round(x.watts)} W`);
  if(x.rpm>0) bits.push(`${Math.round(x.rpm)} rpm`);
  if(x.spm>0) bits.push(`${Math.round(x.spm)} spm`);
  if(x.floors>0) bits.push(`${Math.round(x.floors)} floors`);
  if(x.rounds>0) bits.push(`${x.rounds} rounds${x.work>0?` × ${x.work}s on`:""}${x.rest>0?` / ${x.rest}s off`:""}`);
  if(e.hr>0) bits.push(`♥ ${Math.round(e.hr)} bpm`);
  const est = cardioKcal(e);
  const kc = countedKcal(e);
  const kcText = kc!=null ? `<span class="cardio-kcal">≈ ${Math.round(kc).toLocaleString()} cal</span>` : "";
  const machine = e.machineKcal>0 ? `Machine: ${Math.round(e.machineKcal)} cal${e.useMachine?" (counted)":""}${est?` · App estimate: ${Math.round(est.kcal)} (${est.method})`:""}` : (est ? `Estimate ${est.method}` : "");
  const main = [fmtMin(e.minutes), distText(e), paceText(e), cap(e.effort||"moderate")].filter(Boolean).join(" · ");
  return `<div class="set cardio-row"><span class="note" style="color:var(--ink);font-size:1rem"><span class="num">${esc(main)}</span> ${kcText}
    ${bits.length?`<span class="cardio-meta">${esc(bits.join(" · "))}</span>`:""}${machine?`<span class="cardio-meta">${esc(machine)}</span>`:""}${e.note?`<span class="cardio-meta">${esc(e.note)}</span>`:""}</span>
    <button class="edit" data-edit="${esc(e.id)}" aria-label="Edit cardio entry">Edit</button><button class="del" data-del="${esc(e.id)}" aria-label="Delete cardio entry">Delete</button></div>`;
}
// After a successful log: back to "All muscle groups" with a blank form (date is kept for backfilling).
function resetForm(){
  $("#group-filter").value = ""; prefs.group = ""; savePrefs();
  $("#exercise-search").value = "";
  $("#exercise").value = "";
  showPicker(true);
  $("#new-ex-wrap").hidden = true; $("#new-muscle-wrap").hidden = false;
  $("#muscle").value = "Other"; muscleTouched = false;
  applyEquip({}, prefs.unit); setEquipOpen(false);
  $("#weight").value = 0; $("#reps").value = 10; $("#sets").value = 1;
  mode = "straight"; dropRows = []; $("#drop-rows").innerHTML = ""; dropPicked = false; showLast("");
  document.querySelectorAll(".mode button").forEach(x=>x.setAttribute("aria-pressed", String(x.dataset.mode==="straight")));
  failSets = new Set(); failN = 0; rirPick = null; renderRir(); $("#ss-on").checked = false; renderSuperset();
  $("#note").value = ""; $("#note-wrap").hidden = true; $("#note-toggle").setAttribute("aria-expanded","false");
  $("#c-min").value = 30; $("#c-dist").value = ""; setEffort("moderate"); delete $("#cardio-details").dataset.type; $("#cardio-details").innerHTML = "";
  exShowAll = false; renderPicker(); applyFormKind();
}

async function saveCardio(exercise){
  if(!exercise){ flash($("#new-ex-wrap").hidden ? "Choose an exercise, or pick ＋ New exercise." : "Enter a name for the new exercise.", true); return; }
  const minutes = parseFloat($("#c-min").value);
  if(!(minutes>0)){ flash("Enter how many minutes you did.", true); $("#c-min").focus(); return; }
  const existing = exercisesByRecent().find(n=>n.toLowerCase()===exercise.toLowerCase());
  const name = existing || exercise, type = cardioTypeOf(name), v = readCardioVals();
  const mob = isMobForm();
  const e = {id:uid(), kind: mob?"mobility":"cardio", date:$("#date").value||today(), exercise:name, muscle: mob?"Mobility":"Cardio", minutes, effort, unit:prefs.unit, weight:0, reps:0, sets:1, ts:Date.now(), note:$("#note").value.trim()};
  const dist = mob ? 0 : parseFloat($("#c-dist").value); if(dist>0){ e.distance=dist; e.distUnit=distUnitFor(type); }
  const hr = parseFloat(v.hr); if(hr>0) e.hr=hr;
  const mk = parseFloat(v.mk); if(mk>0){ e.machineKcal=mk; e.useMachine=!!v.use; }
  const x = {};
  (CARDIO_FIELDS[type]||[]).forEach(f=>{
    if(f.k==="split"){ const sp=parseSplit(v.split); if(sp) x.splitSec=sp; return; }
    const n=parseFloat(v[f.k]); if(n>0) x[f.k]=n;
  });
  if(x.speed) x.speedUnit = prefs.unit==="kg" ? "kmh" : "mph";
  if(Object.keys(x).length) e.extra = x;
  rememberBodyWeight();
  const btn=$("#save"); btn.disabled=true;
  try{
    await store.add([e]);
    const k = countedKcal(e);
    flash(`Logged ${fmtMin(minutes)} — ${name}${k!=null?` (≈ ${Math.round(k)} cal)`:""}`);
    resetForm();
  }catch(err){ flash("Couldn't save that entry. Try again.", true); }
  btn.disabled=false;
}

async function saveDrop(exercise){
  if(!exercise){ flash($("#new-ex-wrap").hidden ? "Choose an exercise, or add a new one." : "Enter a name for the new exercise.", true); ($("#new-ex-wrap").hidden ? $("#exercise-search") : $("#exercise")).focus(); return; }
  readDropRows();
  const rows = dropRows.map(r=>({weight:parseFloat(r.weight), reps:parseInt(r.reps,10), fail:!!r.fail}));
  if(rows.length<2){ flash("Add at least two rows for a drop set.", true); return; }
  const bad = rows.findIndex(r=>!(r.weight>=0) || !(r.reps>=1));
  if(bad>=0){ flash(`Check row ${bad+1}: weight 0 or more, reps at least 1.`, true); return; }
  const existing = exercisesByRecent().find(n=>n.toLowerCase()===exercise.toLowerCase());
  const name = existing || exercise, note = $("#note").value.trim(), date = $("#date").value || today();
  const chain = uid(), base = Date.now(), ssf = supersetFields(date);
  const list = rows.map((r,i)=>({id:uid(), date, exercise:name, weight:r.weight, unit:prefs.unit, reps:r.reps, sets:1, note, muscle: $("#muscle").value, ...equipField(), ...bwFields(), ...variantField(), ...ssf, ts:base+i, chain, step:i, failure: r.fail}));
  rememberBodyWeight();
  const btn=$("#save"); btn.disabled=true;
  try{
    await store.add(list);
    flash(`Logged ${rows.length}-step drop set — ${name}`);
    if(supersetLogged(ssf, date, name) && date===today()) startRest();
    resetForm();
  }catch(e){ flash("Couldn't save that drop set. Try again.", true); }
  btn.disabled=false;
}
