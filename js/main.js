// Lift Log: Rest timer, settings sheet, offline support and start-up. Loaded last.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- rest timer ----------
const REST_OPTS = [0,30,45,60,75,90,120,150,180,240,300];
let restEnd = 0, restTotal = 0, restIv = null, restNext = null, restOverT = null, restNotifyT = null, actx = null;
const restDefault = () => (settings.rest && typeof settings.rest.sec==="number") ? settings.rest.sec : 90;
const canNotify = () => "Notification" in window && "serviceWorker" in navigator && !!navigator.serviceWorker.controller && window.top===window;
function renderRestSet(){
  $("#rest-sec").innerHTML = REST_OPTS.map(s=>`<option value="${s}" ${s===restDefault()?"selected":""}>${s?mmss(s):"Off"}</option>`).join("");
  $("#rest-alert-row").hidden = !(canNotify() && Notification.permission==="default");
  const note = $("#rest-alert-note");
  if(note) note.textContent = window.top!==window ? "The timer chimes while the app is open. This version can't send notifications; the home-screen version can on Android."
    : !canNotify() ? "The timer chimes while the app is open. Background alerts need the installed home-screen version."
    : Notification.permission==="granted" ? "Rest alerts are on. On iPhone, an alert may appear only when you return to the app."
    : Notification.permission==="denied" ? "Alerts are blocked. Allow notifications for this app in your phone's settings to turn them on."
    : "The timer chimes while the app is open.";
}
$("#rest-sec").addEventListener("change", e=>{ settings.rest = {sec:+e.target.value}; saveSettings(); });
function unlockAudio(){ try{ if(!actx) actx = new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==="suspended") actx.resume(); }catch(e){} }
function chime(){
  try{ if(!actx) return; const t0 = actx.currentTime;
    [0,0.25,0.5].forEach(d=>{ const o=actx.createOscillator(), g=actx.createGain(); o.type="sine"; o.frequency.value=880;
      g.gain.setValueAtTime(0.0001,t0+d); g.gain.exponentialRampToValueAtTime(0.3,t0+d+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+d+0.18);
      o.connect(g); g.connect(actx.destination); o.start(t0+d); o.stop(t0+d+0.2); });
  }catch(e){}
}
function startRest(sec){
  sec = sec ?? restNext ?? restDefault(); restNext = null;
  if(!(sec>0)){ if(restEnd) finishRest(true); return; }
  restTotal = sec; restEnd = Date.now()+sec*1000;
  clearTimeout(restOverT);
  clearInterval(restIv); restIv = setInterval(tickRest, 250); tickRest(); scheduleNotify();
}
// While resting, the Log button shows the countdown (tapping it still logs) and Rest becomes +30s.
function showRest(text, fill, over){
  const on = text!=null, logTab = document.querySelector('nav.tabs [data-tab="log"]');
  $(".actions").classList.toggle("resting", on); $(".actions").classList.toggle("over", !!over);
  $("#save-rest").hidden = !on;
  $("#rb-time").textContent = on ? text : "";
  $("#rb-fill").style.width = (fill||0).toFixed(1)+"%";
  $("#rest-start").lastChild.textContent = on && !over ? "+30s" : "Rest";
  $("#rest-start").setAttribute("aria-label", on && !over ? "Add 30 seconds of rest" : "Start rest timer");
  logTab.textContent = on && !over ? `Log ${text.match(/\d+:\d\d/)[0]}` : "Log";
}
function tickRest(){
  if(!restEnd) return;
  const left = (restEnd-Date.now())/1000;
  if(left<=0){ finishRest(); return; }
  showRest(`Resting ${mmss(Math.ceil(left))} · tap to log`, 100*(1-left/restTotal));
}
function finishRest(skip){
  clearInterval(restIv); clearTimeout(restNotifyT); clearTimeout(restOverT); restEnd = 0;
  if(skip){ showRest(null); return; }
  showRest("Rest over · log your next set", 100, true);
  chime(); try{ navigator.vibrate && navigator.vibrate([200,100,200]); }catch(e){}
  restOverT = setTimeout(()=>showRest(null), 5000);
}
function scheduleNotify(){
  clearTimeout(restNotifyT);
  if(!canNotify() || Notification.permission!=="granted") return;
  restNotifyT = setTimeout(()=>{ if(document.hidden) navigator.serviceWorker.ready.then(r=>r.showNotification("Rest is over", {body:"Time for your next set.", tag:"liftlog-rest", renotify:true, icon:"icons/icon-192.png"})).catch(()=>{}); }, Math.max(0, restEnd-Date.now()));
}
$("#rest-start").addEventListener("click", ()=>{
  unlockAudio();
  if(!restEnd) return startRest(restDefault() || 90);
  restEnd += 30000; restTotal += 30; tickRest(); scheduleNotify();
});
$("#rest-alerts").addEventListener("click", async ()=>{ try{ await Notification.requestPermission(); }catch(e){} renderRestSet(); });
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) tickRest(); });

// ---------- settings sheet ----------
function applyTheme(){
  const t = prefs.theme || "auto";
  if(t==="auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
  document.querySelectorAll("#set-theme button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.themeOpt===t)));
}
function renderSettings(){
  if($("#settings").hidden) return;
  const r = bwEntryOn(today());
  if(document.activeElement!==$("#set-bw")) $("#set-bw").value = r ? fmt(toUnit(r.w, r.unit)) : "";
  $("#set-bw-unit").textContent = prefs.unit;
  $("#set-bw-note").textContent = r && r.date && r.date!==today() ? `Last recorded ${niceDate(r.date)}. Entering a weight saves it for today; past days keep their own.` : "Used for calories and strength standards. Past days keep the weight recorded for them.";
  const pr = profile();
  document.querySelectorAll("#set-std button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.sstd===pr.std)));
  $("#set-birth").max = new Date().getFullYear()-10;
  if(document.activeElement!==$("#set-birth")) $("#set-birth").value = pr.birthYear || "";
  applyTheme(); renderRestSet();
}
function openSettings(sectionId){
  $("#settings").hidden = false; document.body.style.overflow = "hidden";
  renderSettings(); $("#settings").scrollTop = 0;
  if(sectionId){ const el = document.getElementById(sectionId); if(el) el.scrollIntoView({block:"start"}); }
  $("#settings-done").focus();
}
function closeSettings(){ $("#settings").hidden = true; document.body.style.overflow = ""; $("#open-settings").focus(); }
$("#open-settings").addEventListener("click", ()=>openSettings());
$("#settings-done").addEventListener("click", closeSettings);
document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !$("#settings").hidden) closeSettings(); });
document.addEventListener("click", e=>{ const b = e.target.closest("[data-open-settings]"); if(b) openSettings(b.dataset.openSettings); });
$("#settings").addEventListener("click", e=>{
  const s = e.target.closest("[data-sstd]"); if(s){ settings.profile = Object.assign({}, profile(), {std:s.dataset.sstd}); saveSettings(); return; }
  const t = e.target.closest("[data-theme-opt]");
  if(t){ prefs.theme = t.dataset.themeOpt; savePrefs(); applyTheme(); if(!$("#tab-progress").hidden) renderProgress(); }
});
$("#settings").addEventListener("change", e=>{
  if(e.target.id==="set-bw"){ const n = parseFloat(e.target.value); if(n>0){ recordBW(today(), n); saveSettings(); } return; }
  if(e.target.id==="set-birth"){ const y = parseInt(e.target.value,10), p = Object.assign({}, profile());
    if(y>=1900 && y<=new Date().getFullYear()-10) p.birthYear = y; else delete p.birthYear; settings.profile = p; saveSettings(); }
});
applyTheme();

// ---------- equipment summary ----------
function updateEquipSummary(){
  const eq = equipField().equip;
  $("#equip-sum-text").textContent = eq ? (equipText({equip:eq, unit:prefs.unit}) || "On") : "None";
}
function setEquipOpen(open){ $("#equip-body").hidden = !open; $("#equip-sum").setAttribute("aria-expanded", String(open)); }
$("#equip-sum").addEventListener("click", ()=>setEquipOpen($("#equip-body").hidden));

// ---------- today's plan: collapsible ----------
$("#plan-today").addEventListener("click", e=>{ if(e.target.closest("#plan-toggle")){ prefs.planCollapsed = !prefs.planCollapsed; savePrefs(); renderPlanToday(); } });

function renderAll(){
  renderPicker(); renderBrandList(); renderDay(); renderHistory(); renderPlanToday(); renderHead(); renderQuick(); renderPlan(); renderRestSet(); renderSettings(); renderBackup(); renderPlates(); renderRepeat();
  if(!$("#tab-progress").hidden) renderProgress();
}

window.addEventListener("storage", ev=>{ if(ev.key===LS_KEY){ loadLocal(); renderAll(); } });

// Offline support. A new version waits in the background (see sw.js); offer to switch so the page and its files always match.
if("serviceWorker" in navigator && location.protocol!=="file:"){
  window.addEventListener("load", ()=> navigator.serviceWorker.register("sw.js").then(watchForUpdates).catch(()=>{}));
}
function watchForUpdates(reg){
  const offer = ()=>{
    const w = reg.waiting; if(!w || !navigator.serviceWorker.controller) return;
    toast("A new version of Lift Log is ready.", "Reload", ()=>{
      navigator.serviceWorker.addEventListener("controllerchange", ()=>location.reload(), {once:true});
      w.postMessage("skipWaiting");
    });
  };
  offer();
  reg.addEventListener("updatefound", ()=>{ const w = reg.installing; if(w) w.addEventListener("statechange", ()=>{ if(w.state==="installed") offer(); }); });
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden){ reg.update().catch(()=>{}); offer(); } });
}

applyUnit();
renderAll();
applyFormKind();
updateBWForm();
["input","change","click"].forEach(t=>$("#tab-log").addEventListener(t, ()=>setTimeout(updateVolPreview,0)));
