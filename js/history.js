// Lift Log: History's Day calendar, the one-exercise picker and its summary.
// ES module. Its start-up code runs in init(), which js/app.js calls in a fixed order (see docs/DECISIONS.md).

import { $ } from "./ui.js";
import { entries, isFav, prefs } from "./state.js";
import { e1rm, esc, exercisesByRecent, fmt, loadOf, niceDate, sorted, today } from "./log.js";
import { fmtMin, isCardio } from "./equipment.js";
import { groupOf } from "./catalog.js";
import { exWords, renderHistory } from "./search.js";

let calMonth = null;   // "YYYY-MM" the Day calendar shows; starts at the latest day in the list
const shownMonth = list => calMonth || (list.length ? list[list.length-1].date : today()).slice(0,7);
const filtered = () => { const f = $("#hist-filter").value.toLowerCase(); return sorted().filter(e=>!f || e.exercise.toLowerCase()===f); };

// The Day and Exercise buttons, the open calendar and the one-exercise summary. renderHistory calls this.
function renderHistBar(){
  const f = $("#hist-filter").value, list = filtered();
  $("#hist-ex span").textContent = f || "All";
  $("#hist-ex").classList.toggle("on", !!f);
  if(!$("#hist-cal").hidden) renderCal(list);
  const sum = $("#hist-sum"); sum.hidden = !f || !list.length;
  if(!sum.hidden) sum.innerHTML = summaryHTML(list);
}

function renderCal(list){
  const kinds = new Map();
  list.forEach(e=>{ if(kinds.get(e.date)!=="lift") kinds.set(e.date, isCardio(e) ? "cardio" : "lift"); });
  const ym = shownMonth(list), [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m-1, 1), lead = (first.getDay()+6)%7, n = new Date(y, m, 0).getDate();
  let cells = ["M","T","W","T","F","S","S"].map(w=>`<span class="cal-wd">${w}</span>`).join("") + `<span class="cal-day blank"></span>`.repeat(lead);
  for(let d=1; d<=n; d++){
    const iso = `${ym}-${String(d).padStart(2,"0")}`, k = kinds.get(iso), cls = [k, iso===today()?"today":"", iso>today()?"future":""].filter(Boolean).join(" ");
    cells += k ? `<button type="button" class="cal-day ${cls}" data-hday="${iso}" aria-label="Go to ${esc(niceDate(iso))}">${d}</button>` : `<span class="cal-day ${cls}">${d}</span>`;
  }
  $("#hist-cal").innerHTML = `<div class="cal-nav"><button type="button" data-hcal="-1" aria-label="Previous month">‹</button><span class="cal-title">${first.toLocaleDateString(undefined,{month:"long", year:"numeric"})}</span>
    <button type="button" data-hcal="1" aria-label="Next month" ${ym>=today().slice(0,7)?"disabled":""}>›</button></div><div class="cal-grid">${cells}</div>`;
}

function summaryHTML(list){
  const days = [...new Set(list.map(e=>e.date))], stat = (v, l) => `<div><b>${esc(v)}</b><small>${l}</small></div>`;
  let stats;
  if(list.every(isCardio)){
    const mins = list.map(e=>e.minutes||0);
    stats = stat(days.length, "Sessions") + stat(fmtMin(Math.max(...mins)), "Longest") + stat(fmtMin(mins.reduce((a,b)=>a+b,0)), "Total");
  } else {
    const lifts = list.filter(e=>!isCardio(e)), ranked = lifts.filter(e=>e.reps>0 && e.reps<=10);
    const pool = ranked.length ? ranked : lifts, score = e => ranked.length ? e1rm(loadOf(e), e.reps) : loadOf(e);
    const best = pool.reduce((b, e)=> !b || score(e)>score(b) ? e : b, null);
    stats = stat(days.length, days.length===1 ? "Session" : "Sessions") + stat(best ? `${fmt(loadOf(best))} × ${best.reps}` : "—", "Best set") +
      stat(ranked.length ? `${Math.round(score(best))} ${prefs.unit}` : "—", "Est. 1RM");
  }
  return `<div class="ex-sum">${stats}</div><p class="cal-sub" style="margin-bottom:0">Since ${esc(niceDate(days[0]))} · last ${esc(niceDate(days[days.length-1]))}. <button type="button" class="clear" id="hist-clear">Clear</button></p>`;
}

// The one-exercise picker: favorites you've logged first, then the rest by most recent.
function renderPick(){
  const q = exWords($("#hist-q").value), logged = exercisesByRecent();
  const names = [...logged.filter(isFav), ...logged.filter(n=>!isFav(n))]
    .filter(n=>{ const w = exWords(n); return q.every(t=>w.some(x=>x.startsWith(t))); });
  const count = n => new Set(entries.filter(e=>e.exercise.toLowerCase()===n.toLowerCase()).map(e=>e.date)).size;
  $("#hist-list").innerHTML = names.length ? names.map(n=>`<button type="button" class="ex-opt" data-hex="${esc(n)}"><span class="ex-txt"><span class="ex-n">${esc(n)}${isFav(n)?' <span class="fav-mark">★</span>':""}</span><span class="ex-m">${esc(groupOf(n))} · ${count(n)} day${count(n)===1?"":"s"}</span></span></button>`).join("")
    : `<p class="ex-tip">No logged exercise matches.</p>`;
}
function openPick(){ $("#hist-q").value = ""; renderPick(); $("#hist-pick").hidden = false; $("#hist-q").focus(); }
function closePick(){ $("#hist-pick").hidden = true; $("#hist-ex").focus(); }
function showOnly(name){ $("#hist-filter").value = name; calMonth = null; renderHistory(); }

export function init(){
  $("#hist-day").onclick = ()=>{
    const open = $("#hist-cal").hidden; $("#hist-cal").hidden = !open; $("#hist-day").setAttribute("aria-expanded", String(open));
    $("#hist-day").classList.toggle("on", open); calMonth = null; if(open) renderCal(filtered());
  };
  $("#hist-cal").addEventListener("click", e=>{
    const nav = e.target.closest("[data-hcal]"), day = e.target.closest("[data-hday]");
    if(nav){ const [y, m] = shownMonth(filtered()).split("-").map(Number), d = new Date(y, m-1+(+nav.dataset.hcal), 1); calMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; renderCal(filtered()); }
    if(day){ $("#hist-cal").hidden = true; $("#hist-day").setAttribute("aria-expanded","false"); $("#hist-day").classList.remove("on");
      const el = document.getElementById("day-"+day.dataset.hday); if(el) el.scrollIntoView({block:"start"}); }
  });
  $("#hist-ex").onclick = openPick;
  $("#hist-q").addEventListener("input", renderPick);
  $("#hist-q").addEventListener("keydown", e=>{ if(e.key==="Enter"){ const b = $("#hist-list [data-hex]"); if(b) b.click(); } });
  $("#hist-list").addEventListener("click", e=>{ const b = e.target.closest("[data-hex]"); if(!b) return; showOnly(b.dataset.hex); closePick(); });
  $("#hist-pick-close").onclick = closePick;
  $("#hist-pick").addEventListener("click", e=>{ if(e.target.id==="hist-pick") closePick(); });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !$("#hist-pick").hidden) closePick(); });
  $("#hist-sum").addEventListener("click", e=>{ if(e.target.id==="hist-clear") showOnly(""); });
}

export { renderHistBar };
