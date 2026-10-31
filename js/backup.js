// Lift Log: CSV export and import, and full backups with the reminder.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- CSV export / import ----------
const CSV_COLS = ["id","date","exercise","weight","unit","reps","set_type","chain_id","step","to_failure","equipment","note","equipment_json","muscle_group","kind","minutes","distance","dist_unit","effort","avg_hr","machine_kcal","use_machine","cardio_json","rir","superset","superset_lead"];
function toCSV(){
  const rows=[CSV_COLS];
  sorted().forEach(e=>rows.push([e.id,e.date,e.exercise,e.weight,e.unit,e.reps,(e.kind==="cardio"||e.kind==="mobility")?e.kind:e.chain?"drop":"straight",e.chain||"",e.chain?e.step+1:"",e.failure?"yes":"",equipText(e),e.note||"",e.equip?JSON.stringify(e.equip):"",e.muscle||"",e.kind||"strength",e.minutes||"",e.distance||"",e.distUnit||"",e.effort||"",e.hr||"",e.machineKcal||"",e.useMachine?"yes":"",e.extra?JSON.stringify(e.extra):"",e.rir??"",e.ss||"",e.ssLead?"yes":""]));
  return rows.map(r=>r.map(v=>{const s=String(v); return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(",")).join("\n");
}
function parseCSV(text){
  const rows=[]; let row=[], f="", q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"') q=true;
    else if(c===','){ row.push(f); f=""; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=""; }
    else f+=c;
  }
  if(f!==""||row.length){ row.push(f); rows.push(row); }
  return rows.filter(r=>r.some(x=>x.trim()!==""));
}
// Opens the share sheet (Save to Files, Mail…) where there is one, else downloads. False if cancelled.
async function shareOrSave(file, title){
  try{
    if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title}); return true; }
  }catch(e){ if(e && e.name==="AbortError") return false; }
  const a=document.createElement("a"); a.href=URL.createObjectURL(file); a.download=file.name;
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1000);
  return true;
}
$("#export").onclick = ()=> shareOrSave(new File([toCSV()], `lift-log-${today()}.csv`, {type:"text/csv"}), "Lift Log sets");

// ---------- full backup: sets, plan, body weight and settings in one file ----------
const daysSince = iso => Math.round((Date.parse(today()+"T00:00:00Z") - Date.parse(iso+"T00:00:00Z"))/864e5);
async function backUp(){
  const data = {app:"Lift Log", backup:1, exported:new Date().toISOString(), entries, settings, prefs};
  const file = new File([JSON.stringify(data)], `lift-log-backup-${today()}.json`, {type:"application/json"});
  if(!(await shareOrSave(file, "Lift Log backup"))) return;
  prefs.lastBackup = today(); delete prefs.backupSnooze; savePrefs(); renderBackup();
}
// Reminder after 2 weeks without a backup (or a week of logging and none yet). "Later" waits a week.
function backupDue(){
  if(!entries.length || (prefs.backupSnooze && prefs.backupSnooze>today())) return null;
  if(prefs.lastBackup){ const d = daysSince(prefs.lastBackup); return d>=14 ? `Your last backup was ${d} days ago.` : null; }
  return daysSince(sorted()[0].date)>=7 ? "You haven't backed up yet." : null;
}
function renderBackup(){
  const d = prefs.lastBackup ? daysSince(prefs.lastBackup) : null;
  $("#backup-info").textContent = (d==null ? "Not backed up yet." : `Last backup: ${d<=0?"today":d===1?"yesterday":`${d} days ago`}.`) +
    " A backup holds your sets, plan, body weight and settings. Keep it in Files or email it to yourself.";
  const due = backupDue(), n = $("#backup-nudge");
  n.hidden = !due;
  if(due) n.innerHTML = `<p><b>Back up your log.</b> ${esc(due)} A backup keeps your sets, plan and settings safe if you change or lose your phone.</p>
    <div class="data-actions"><button type="button" class="primary" data-backup>Back up now</button><button type="button" class="secondary" data-later>Later</button></div>`;
}
$("#backup").onclick = backUp;
$("#backup-nudge").addEventListener("click", e=>{
  if(e.target.closest("[data-backup]")) backUp();
  else if(e.target.closest("[data-later]")){
    const d = new Date(today()+"T00:00:00Z"); d.setUTCDate(d.getUTCDate()+7);
    prefs.backupSnooze = d.toISOString().slice(0,10); savePrefs(); renderBackup();
  }
});
// Sets are merged by id (never duplicated); the plan, body weight and settings are replaced only if you say so.
async function restoreBackup(text){
  let b; try{ b = JSON.parse(text); }catch(e){ notify("Couldn't read that file."); return; }
  if(!b || b.app!=="Lift Log" || !Array.isArray(b.entries)){ notify("That doesn't look like a Lift Log backup."); return; }
  const have = new Set(entries.map(e=>e.id));
  const added = b.entries.filter(e=>e && e.id && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.exercise && !have.has(e.id) && have.add(e.id));
  const all = b.settings && typeof b.settings==="object" && await dialog({message:"Also restore your plan, body weight history and settings from this backup? They replace what's on this phone now. Your logged sets are kept either way.", ok:"Restore all", cancel:"Sets only"});
  if(!added.length && !all){ notify("Everything in that backup is already on this phone."); return; }
  entries.push(...added); saveLocal();
  if(all){
    try{ localStorage.setItem(SET_KEY, JSON.stringify(Object.assign({bw:null, bwUnit:"lb", days:{}, bwLog:{}}, b.settings))); }catch(e){}
    const last = [prefs.lastBackup, b.prefs && b.prefs.lastBackup].filter(Boolean).sort().pop();
    prefs = Object.assign({unit:"lb"}, b.prefs && typeof b.prefs==="object" ? b.prefs : prefs, last ? {lastBackup:last} : {}); savePrefs();
  }
  await notify(`Restored ${added.length} entr${added.length===1?"y":"ies"}${all?" plus your plan and settings":""}.`);
  location.reload();
}
$("#import").onclick = ()=> $("#import-file").click();
$("#import-file").onchange = async ev=>{
  const file = ev.target.files[0]; ev.target.value=""; if(!file) return;
  let text; try{ text = await file.text(); }catch(e){ notify("Couldn't read that file."); return; }
  if(/\.json$/i.test(file.name) || /^\s*\{/.test(text)) return restoreBackup(text);
  const rows = parseCSV(text);
  if(rows.length<2){ notify("That file has no workout rows."); return; }
  const head = rows[0].map(h=>h.trim().toLowerCase()), col = k=>head.indexOf(k);
  if(col("date")<0 || col("exercise")<0 || col("reps")<0 || col("weight")<0){ notify("That doesn't look like a Lift Log export."); return; }
  const have = new Set(entries.map(e=>e.id)), added=[]; let skipped=0;
  rows.slice(1).forEach((r,i)=>{
    const g = k=> col(k)>=0 ? (r[col(k)]||"").trim() : "";
    const date=g("date"), exercise=g("exercise"), weight=parseFloat(g("weight")), reps=parseInt(g("reps"),10);
    if(g("kind")==="cardio" || g("kind")==="mobility"){
      const minutes=parseFloat(g("minutes"));
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !exercise || !(minutes>0)){ skipped++; return; }
      const id = g("id") || uid(); if(have.has(id)) return; have.add(id);
      const c = {id, kind:g("kind"), date, exercise, muscle: g("kind")==="mobility"?"Mobility":"Cardio", minutes, effort:g("effort")||"moderate", unit:g("unit")==="kg"?"kg":"lb", weight:0, reps:0, sets:1, note:g("note"), ts:Date.parse(date+"T12:00:00")+i};
      const d=parseFloat(g("distance")); if(d>0){ c.distance=d; c.distUnit=g("dist_unit")||"mi"; }
      const hr=parseFloat(g("avg_hr")); if(hr>0) c.hr=hr;
      const mk=parseFloat(g("machine_kcal")); if(mk>0){ c.machineKcal=mk; c.useMachine=g("use_machine")==="yes"; }
      try{ const x=g("cardio_json"); if(x) c.extra=JSON.parse(x); }catch(_){}
      added.push(c); return;
    }
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !exercise || !(weight>=0) || !(reps>=1)){ skipped++; return; }
    const id = g("id") || uid();
    if(have.has(id)) return;
    have.add(id);
    const e = {id, date, exercise, weight, unit: g("unit")==="kg"?"kg":"lb", reps, sets:1, note:g("note"), ts: Date.parse(date+"T12:00:00")+i};
    const chain=g("chain_id"); if(chain){ e.chain=chain; e.step=Math.max(0,(parseInt(g("step"),10)||1)-1); }
    if(g("to_failure").toLowerCase()==="yes") e.failure=true;
    try{ const eq=g("equipment_json"); if(eq) e.equip=JSON.parse(eq); }catch(_){}
    const mg=g("muscle_group"); if(mg) e.muscle=mg;
    const rir=parseInt(g("rir"),10); if(rir>=0 && rir<=4) e.rir=rir;
    const ss=g("superset"); if(ss){ e.ss=ss; if(g("superset_lead")==="yes") e.ssLead=true; }
    added.push(e);
  });
  if(!added.length){ notify(skipped?`Nothing imported — ${skipped} row(s) weren't valid.`:"Everything in that file is already in your log."); return; }
  await store.add(added);
  notify(`Imported ${added.length} entr${added.length===1?"y":"ies"}.` + (skipped?` Skipped ${skipped} invalid row(s).`:""));
};
