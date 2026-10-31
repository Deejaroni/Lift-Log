// Lift Log: Exercise details sheet (muscles, rename, merge) and repeating a past workout.
// ES module. Its start-up code runs in init(), which js/app.js calls in a fixed order (see docs/DECISIONS.md).

import { $, askConfirm } from "./ui.js";
import { entries, prefs, renameExercise, saveLocal, savePrefs, saveSettings, settings } from "./state.js";
import { esc, exercisesByRecent, fmt, loadOf, mode, niceDate, sorted, toUnit, today, totalRaw, updateVolPreview } from "./log.js";
import { applyEquip, isCardio } from "./equipment.js";
import { MUSCLES, groupOf, normMuscle } from "./catalog.js";
import { EX_INDEX, alsoOf, chooseExercise, chosenMeta, exWords, osa } from "./search.js";
import { P, TIMED, loggedFor, startPlanned } from "./plan.js";
import { visualFor, animate, stopAnimating, bodyMapMarkup } from "./visuals.js";

// ---------- exercise details: main muscle group and what else it works ----------
let exsName = null, exsAlso = new Set();
function openExerciseInfo(name){
  if(!name) return;
  exsName = name;
  const main = groupOf(name), timed = TIMED.has(main);
  renderHowTo(name);
  setEditOpen(timed);   // cardio and mobility have nothing to show but the name
  $("#exs-name").value = name; renderSame();
  $("#exs-muscles").hidden = timed;   // cardio and mobility have no muscle groups to set
  if(!timed){
    $("#exs-main").innerHTML = MUSCLES.filter(m=>!TIMED.has(m)).map(m=>`<option ${m===main?"selected":""}>${m}</option>`).join("");
    exsAlso = new Set(alsoOf(name)); renderAlso();
  }
  $("#exsheet").hidden = false; (timed ? $("#exs-name") : $("#exs-close")).focus();
}
// The how-to part: animation, body map with the muscles worked, and three steps.
function renderHowTo(name){
  const v = visualFor(name), anim = $("#exs-anim");
  $("#exs-title").textContent = name;
  $("#exs-info").hidden = !!v.timed;
  anim.toggleAttribute("hidden", !v.pat);   // an SVG element has no hidden property, only the attribute
  if(v.pat){ anim.setAttribute("aria-label", `${name}, animated, working ${v.main}`); animate(anim, v); } else stopAnimating(anim);
  $("#exs-map").innerHTML = v.timed ? "" : bodyMapMarkup(v.roles);
  $("#exs-muscles-text").innerHTML = v.timed ? "" : `<span class="mus-dot"></span>${esc(v.main)}` + (v.also.length ? `<br><span class="mus-dot also"></span>${esc(v.also.join(" · "))}` : "");
  $("#exs-steps").innerHTML = v.pat ? v.pat.steps.map(s=>`<li>${esc(s)}</li>`).join("") : "";
}
function setEditOpen(open){ $("#exs-edit-wrap").hidden = !open; $("#exs-edit").setAttribute("aria-expanded", String(open)); }
// Names that look like the same exercise (a typo or different spacing): yours first, then the library's.
function renderSame(){
  const me = exsName.toLowerCase(), sq = exWords(exsName).join("");
  const near = n => { const q = exWords(n).join(""); return q===sq || (Math.min(q.length, sq.length)>=5 && osa(q, sq, 2)<=2); };
  const names = [...new Set([...exercisesByRecent(), ...[...EX_INDEX.values()].map(x=>x.name)])].filter(n=>n.toLowerCase()!==me && near(n)).slice(0, 3);
  $("#exs-same-wrap").hidden = !names.length;
  $("#exs-same").innerHTML = names.map(n=>`<button type="button" class="also-chip" data-same="${esc(n)}">${esc(n)}</button>`).join("");
}
function renderAlso(){
  const main = $("#exs-main").value; exsAlso.delete(main);
  $("#exs-also").innerHTML = MUSCLES.filter(m=>!TIMED.has(m) && m!=="Other" && m!==main)
    .map(m=>`<button type="button" class="also-chip" data-also="${m}" aria-pressed="${exsAlso.has(m)}">${m}</button>`).join("");
}
function closeExerciseInfo(){ $("#exsheet").hidden = true; stopAnimating($("#exs-anim")); exsName = null; }
// Saves the name (renaming, or merging into a name you already have) and the muscle groups.
// Every past set moves to the new name and main group.
async function saveExerciseInfo(){
  const from = exsName, fl = from.toLowerCase(), timed = TIMED.has(groupOf(from));
  let name = $("#exs-name").value.trim().replace(/\s+/g," ") || from;
  if(name!==from){
    const nl = name.toLowerCase(), have = nl!==fl && (exercisesByRecent().find(n=>n.toLowerCase()===nl) || EX_INDEX.get(nl)?.name);
    if(have){
      const n = entries.filter(e=>e.exercise.toLowerCase()===fl).length, what = timed ? `entr${n===1?"y":"ies"}` : `set${n===1?"":"s"}`;
      if(!(await askConfirm(`Merge ${from} into ${have}? Its ${n} ${what} will be listed as ${have}.`, "Merge"))) return;
      name = have;
    }
    renameExercise(fl, name);
  }
  const l = name.toLowerCase(), chosen = $("#exercise").value.trim().toLowerCase()===fl && $("#new-ex-wrap").hidden;
  if(!timed){
    const main = $("#exs-main").value;
    settings.exercises[l] = {muscle:main, also:MUSCLES.filter(m=>exsAlso.has(m))};
    entries.forEach(e=>{ if(e.exercise.toLowerCase()===l && !isCardio(e)) e.muscle = main; });
    if(chosen) $("#muscle").value = main;
  }
  saveLocal(); savePrefs();
  closeExerciseInfo();
  if(chosen){ $("#exercise").value = name; $("#ex-chosen-name").textContent = name; chosenMeta(name); }
  saveSettings();
}

// ---------- repeat a past workout ----------
// Copies a past day into a checklist for today: each exercise's top set (weight, reps, equipment) and how many sets.
function repeatDay(date){
  const items = [], by = new Map(), chains = new Set();
  sorted().filter(e=>e.date===date).forEach(e=>{
    const k = e.exercise.toLowerCase();
    if(!by.has(k)){ const it = {exercise:e.exercise, muscle:e.muscle, timed:isCardio(e), sets:0}; by.set(k, it); items.push(it); }
    const it = by.get(k);
    if(it.timed){ it.minutes = (it.minutes||0) + (e.minutes||0); it.sets = 1; return; }
    if(!e.chain || !chains.has(e.chain)) it.sets++;   // a drop set counts once
    if(e.chain) chains.add(e.chain);
    const top = it.weight==null || loadOf(e) > toUnit(totalRaw(it), it.unit) || (loadOf(e)===toUnit(totalRaw(it), it.unit) && e.reps>it.reps);
    if(top) Object.assign(it, {weight:e.weight, unit:e.unit, reps:e.reps, equip:e.equip});
  });
  prefs.repeat = {from:date, on:today(), items}; savePrefs();
  document.querySelector('nav.tabs [data-tab="log"]').click();
  renderRepeat();
}
function renderRepeat(){
  const r = prefs.repeat, box = $("#repeat-today"), date = $("#date").value || today();
  if(!r || r.on!==today() || !Array.isArray(r.items)){ box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<div class="ex-head"><h2 style="margin:0">Repeat ${esc(niceDate(r.from))}</h2><button type="button" class="rep-x" data-repeat-close aria-label="Close the repeated workout">×</button></div>` +
    r.items.map((it,i)=>{
      const got = loggedFor(it.exercise, date).length, need = it.timed ? 1 : it.sets, done = it.timed ? Math.min(got,1) : got, complete = done>=need;
      const target = it.timed ? `${fmt(it.minutes)} min` : `${it.sets} × ${it.reps}${it.weight>0 ? ` @ ${fmt(toUnit(it.weight, it.unit))} ${prefs.unit}` : ""}`;
      return `<div class="plan-item${complete?" done":""}"><div class="pi-main"><span class="pi-name">${esc(it.exercise)}</span><span class="cardio-meta">${esc(target)}</span></div>
        <span class="tag">${it.timed ? (complete?"Done":"—") : `${done}/${need}`}</span><button type="button" class="edit" data-repeat-start="${i}">${complete?"More":"Start"}</button></div>`;
    }).join("");
}
function startRepeat(i){
  const it = prefs.repeat.items[i], date = $("#date").value || today(); if(!it) return;
  $("#group-filter").value = ""; $("#group-filter").dispatchEvent(new Event("change"));
  const l = it.exercise.toLowerCase(), name = exercisesByRecent().find(n=>n.toLowerCase()===l) || EX_INDEX.get(l)?.name || it.exercise;
  chooseExercise(name, normMuscle(it.muscle, name));
  if(it.timed) $("#c-min").value = fmt(it.minutes);
  else {
    if(mode!=="straight") document.querySelector('.mode [data-mode="straight"]').click();
    applyEquip(it.equip || {}, it.unit);
    $("#weight").value = fmt(toUnit(it.weight||0, it.unit)); $("#reps").value = it.reps;
    $("#sets").value = Math.max(1, it.sets - loggedFor(it.exercise, date).length);
  }
  updateVolPreview();
  $("#log-form").scrollIntoView({behavior:"smooth", block:"start"});
}

// ----- Plan tab -----
let planEdit = null;   // section being edited: "name" | "schedule" | "prog" | "change" | a workout id
let itemEdit = null;   // "workoutId|index" of the exercise whose targets are open
// Setters for values other files change.
function setPlanEdit(v){ planEdit = v; }
function setItemEdit(v){ itemEdit = v; }

export function init(){
  $("#exs-close").addEventListener("click", closeExerciseInfo);
  $("#exs-edit").addEventListener("click", ()=>{ const open = $("#exs-edit-wrap").hidden; setEditOpen(open); if(open) $("#exs-name").focus(); });
  $("#exs-main").addEventListener("change", renderAlso);
  $("#exs-same").addEventListener("click", e=>{ const b = e.target.closest("[data-same]"); if(b) $("#exs-name").value = b.dataset.same; });
  $("#exs-also").addEventListener("click", e=>{
    const b = e.target.closest("[data-also]"); if(!b) return;
    exsAlso.has(b.dataset.also) ? exsAlso.delete(b.dataset.also) : exsAlso.add(b.dataset.also);
    b.setAttribute("aria-pressed", String(exsAlso.has(b.dataset.also)));
  });
  $("#exs-save").addEventListener("click", saveExerciseInfo);
  $("#exs-cancel").addEventListener("click", closeExerciseInfo);
  $("#exsheet").addEventListener("click", e=>{ if(e.target.id==="exsheet") closeExerciseInfo(); });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && !$("#exsheet").hidden) closeExerciseInfo(); });
  $("#history").addEventListener("click", e=>{ const b = e.target.closest("[data-exinfo]"); if(b) openExerciseInfo(b.dataset.exinfo); });
  $("#ex-chosen-text").addEventListener("click", ()=>{ if($("#new-ex-wrap").hidden) openExerciseInfo($("#exercise").value.trim()); });
  $("#repeat-today").addEventListener("click", e=>{
    const b = e.target.closest("[data-repeat-start]"); if(b) return startRepeat(+b.dataset.repeatStart);
    if(e.target.closest("[data-repeat-close]")){ delete prefs.repeat; savePrefs(); renderRepeat(); }
  });
  $("#history").addEventListener("click", e=>{ const b = e.target.closest("[data-repeat]"); if(b) repeatDay(b.dataset.repeat); });
  $("#plan-today").addEventListener("click", e=>{ const b=e.target.closest("[data-plan-start]"); if(b) startPlanned(+b.dataset.planStart); });
  $("#plan-today").addEventListener("change", e=>{
    if(e.target.id!=="plan-switch") return;
    const pr = P(), date = $("#date").value||today(), v = e.target.value;
    pr.override = v==="" ? null : {date, wid: v==="__rest" ? null : v};
    saveSettings();
  });
}

export { renderHowTo, setEditOpen, exsName, exsAlso, openExerciseInfo, renderSame, renderAlso, closeExerciseInfo, saveExerciseInfo, repeatDay, renderRepeat, startRepeat, planEdit, itemEdit, setPlanEdit, setItemEdit };
