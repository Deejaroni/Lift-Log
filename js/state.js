// Lift Log: Saved data: preferences, settings, logged entries, and migrations for older saved data.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- prefs (per-device convenience) ----------
let prefs = {unit:"lb"};
try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)||"{}")); } catch(e){}
function savePrefs(){ try{ localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }catch(e){} }

// ---------- personal settings: body weight + per-day calorie adjustments ----------
const SET_KEY = "liftlog.settings.v1";
let settings = {bw:null, bwUnit:"lb", days:{}, bwLog:{}};
try { settings = Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY)||"{}")); } catch(e){}
if(!settings.days || typeof settings.days!=="object") settings.days = {};
if(!settings.bwLog || typeof settings.bwLog!=="object") settings.bwLog = {};
// Added 2026-10-31: your own muscle groups per exercise, {"lowercase name": {muscle, also:[...]}}. Older data has none.
if(!settings.exercises || typeof settings.exercises!=="object" || Array.isArray(settings.exercises)) settings.exercises = {};
// Body weight for a given day: that day's entry, else the latest earlier one, else the general setting.
function bwEntryOn(date){
  const log = settings.bwLog || {};
  const ds = Object.keys(log).filter(d=>log[d] && log[d].w>0).sort();
  const before = ds.filter(d=>d<=date);
  if(before.length){ const r=log[before[before.length-1]]; return {w:r.w, unit:r.unit||"lb", date:before[before.length-1]}; }
  if(settings.bw>0) return {w:settings.bw, unit:settings.bwUnit||"lb", date:null};
  if(ds.length){ const r=log[ds[0]]; return {w:r.w, unit:r.unit||"lb", date:ds[0]}; }
  return null;
}
const bwKgOn = date => { const r=bwEntryOn(date); return r ? (r.unit==="kg" ? r.w : r.w*KG_PER_LB) : null; };
const hasBW = date => bwKgOn(date)!=null;
function recordBW(date, n){
  settings.bwLog = settings.bwLog || {};
  settings.bwLog[date] = {w:n, unit:prefs.unit};
  const latest = Object.keys(settings.bwLog).sort().pop();
  if(date>=latest){ settings.bw = n; settings.bwUnit = prefs.unit; }
}
async function saveSettings(){
  try{ localStorage.setItem(SET_KEY, JSON.stringify(settings)); }catch(e){}
  if(typeof col!=="undefined" && col && typeof backend!=="undefined" && backend==="db"){
    try{ await col.doc("__settings").set(Object.assign({kind:"settings"}, settings)); }catch(e){}
  }
  renderAll();
}

// ---------- storage: synced db when available, local fallback ----------
let entries = [];

function loadLocal(){
  try { entries = JSON.parse(localStorage.getItem(LS_KEY)||"[]"); } catch(e){ entries = []; }
  if(!Array.isArray(entries)) entries = [];
}
function saveLocal(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(entries)); }catch(e){ flash("Couldn't save on this device.", true); } }

const store = {
  async add(list){ entries.push(...list); saveLocal(); renderAll(); },
  async put(list){ const m=new Map(list.map(e=>[e.id,e])); entries = entries.map(e=>m.get(e.id)||e); saveLocal(); renderAll(); },
  async remove(id){ return this.removeMany([id]); },
  async removeMany(ids){ const set=new Set(ids); entries = entries.filter(e=>!set.has(e.id)); saveLocal(); renderAll(); }
};

loadLocal();

// Renames an exercise everywhere it's stored: sets, plan, muscle settings and a repeated workout. from is lowercase.
function renameExercise(from, to){
  entries.forEach(e=>{ if(e.exercise.toLowerCase()===from) e.exercise = to; });
  const p = settings.program;
  if(p && Array.isArray(p.workouts)) p.workouts.forEach(w=>(w.items||[]).forEach(it=>{ if((it.exercise||"").toLowerCase()===from) it.exercise = to; }));
  const ex = settings.exercises, tl = to.toLowerCase();
  if(ex[from] && from!==tl){ if(!ex[tl]) ex[tl] = ex[from]; delete ex[from]; }
  if(prefs.repeat && Array.isArray(prefs.repeat.items)) prefs.repeat.items.forEach(it=>{ if((it.exercise||"").toLowerCase()===from) it.exercise = to; });
}
// Migration (2026-10-31): duplicate spellings removed from the exercise library move to the name that was kept.
const RETIRED = {"high-to-low cable fly":"Cable fly — high-to-low", "high row machine":"High-row machine", "cable high row":"High cable row", "reverse ez-bar curl":"EZ-bar reverse curl"};
{
  const used = l => entries.some(e=>e.exercise.toLowerCase()===l) || settings.exercises[l] ||
    (settings.program && (settings.program.workouts||[]).some(w=>(w.items||[]).some(it=>(it.exercise||"").toLowerCase()===l)));
  const old = Object.keys(RETIRED).filter(used);
  if(old.length){
    old.forEach(l=>renameExercise(l, RETIRED[l]));
    saveLocal(); savePrefs();
    try{ localStorage.setItem(SET_KEY, JSON.stringify(settings)); }catch(e){}
  }
}

// Ask the browser not to evict this app's storage
try{ navigator.storage && navigator.storage.persist && navigator.storage.persist(); }catch(e){}
