// Lift Log: Exercise search and the picker on the Log tab.
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// ---------- exercise search (Log tab) ----------
// Phrases that mean the same exercise. A name containing one is also found by the others.
const ALIASES = [
  ["rdl","romanian deadlift"], ["sldl","stiff leg deadlift","stiff legged deadlift"],
  ["ohp","overhead press","shoulder press","military press"],
  ["db","dumbbell"], ["bb","barbell"], ["kb","kettlebell"], ["bw","bodyweight"],
  ["pec deck","pec fly","butterfly","machine fly"], ["fly","flye","flies"],
  ["skull crusher","lying triceps extension","french press"],
  ["pulldown","pull down"], ["pushdown","push down","pressdown"], ["push up","press up"],
  ["back extension","hyperextension","roman chair"],
  ["leg curl","hamstring curl"], ["leg extension","quad extension","knee extension"],
  ["calf","calves"], ["calf raise","heel raise"],
  ["reverse fly","rear delt fly","reverse pec deck"], ["lateral raise","side raise","side lateral"],
  ["bulgarian split squat","bss","rear foot elevated split squat","rfess"], ["glute ham raise","ghr"],
  ["t bar","landmine row"], ["hip abduction","abductor","outer thigh"], ["hip adduction","adductor","inner thigh"],
  ["preacher","scott curl"], ["abs","abdominal","core"],
  ["stair climber","stairmaster","stepmill"], ["rowing machine","rower","erg"],
  ["air bike","assault bike","fan bike"], ["elliptical","cross trainer"],
];
// Everyday words for each muscle group; these match more weakly than the name itself.
const MUSCLE_WORDS = {Chest:"pec", Back:"lat", Shoulders:"delt", Abdominals:"abs core", Quadriceps:"quad leg",
  Hamstrings:"leg", Glutes:"butt hip leg", Calves:"calf leg", Forearms:"grip wrist", Mobility:"stretch"};
const exNorm = s => String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ'’]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const exStem = w => w.length<=3 || /(ss|us|is)$/.test(w) ? w : /ies$/.test(w) ? w.slice(0,-3)+"y" : /(sses|xes|ches|shes)$/.test(w) ? w.slice(0,-2) : w.endsWith("s") ? w.slice(0,-1) : w;
const exWords = s => exNorm(s).split(" ").filter(Boolean).map(exStem);
const ALIAS_WORDS = ALIASES.map(g=>g.map(p=>exWords(p).join(" ")));
function exEntry(name, muscles){
  const words = exWords(name), hay = ` ${words.join(" ")} `, extra = [];
  ALIAS_WORDS.forEach(g=>{ if(g.some(p=>hay.includes(` ${p} `))) g.forEach(p=>extra.push(...p.split(" "))); });
  const ctx = muscles.flatMap(x=>exWords(`${x.m} ${x.sub} ${MUSCLE_WORDS[x.m]||""}`));
  return {name, muscles, words, key:words.join(" "), squash:words.join(""), tokens:[...new Set([...words, ...extra])], ctx:[...new Set(ctx)]};
}
// One entry per name; an exercise listed under several muscles keeps all of them.
const EX_INDEX = (()=>{
  const by = new Map();
  CATALOG.forEach(g=>g.names.forEach(n=>{ const l=n.toLowerCase(); if(!by.has(l)) by.set(l, {name:n, muscles:[]}); by.get(l).muscles.push({m:g.muscle, sub:g.sub}); }));
  return new Map([...by].map(([l,v],i)=>[l, {...exEntry(v.name, v.muscles), order:i}]));
})();
const entryFor = name => EX_INDEX.get(name.toLowerCase()) || {...exEntry(name, [{m:groupOf(name), sub:"My exercises"}]), order:-1};
// Optimal string alignment distance, giving up once it passes k.
function osa(a, b, k){
  if(Math.abs(a.length-b.length)>k) return k+1;
  let prev2 = null, prev = [...Array(b.length+1).keys()];
  for(let i=1;i<=a.length;i++){
    const cur=[i]; let best=i;
    for(let j=1;j<=b.length;j++){
      let v = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
      if(prev2 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) v = Math.min(v, prev2[j-2]+1);
      cur.push(v); if(v<best) best=v;
    }
    if(best>k) return k+1;
    prev2=prev; prev=cur;
  }
  return prev[b.length];
}
// How well one search word fits: name beats muscle/subgroup, exact beats a typo.
function wordFit(w, x){
  const k = w.length>=7 ? 2 : w.length>=4 ? 1 : 0;
  const near = t => k>0 && (osa(w,t,k)<=k || (t.length>w.length && osa(w,t.slice(0,w.length),k)<=k));
  if(x.words[0].startsWith(w)) return 4;
  if(x.words.some(t=>t.startsWith(w))) return 3;
  if(x.tokens.some(t=>t.startsWith(w))) return 2.2;   // only through an alias
  if(w.length>=4 && x.squash.includes(w)) return 2.5;
  if(x.ctx.some(t=>t.startsWith(w))) return 1.5;
  if(x.tokens.some(near)) return 1;
  if(x.ctx.some(near)) return 0.5;
  return 0;
}
// Every word in the library, with how many names use it, for spelling fixes. Alias and muscle words count once.
const EX_VOCAB = new Map();
EX_INDEX.forEach(x=>x.words.forEach(t=>EX_VOCAB.set(t, (EX_VOCAB.get(t)||0)+1)));
EX_INDEX.forEach(x=>[...x.tokens, ...x.ctx].forEach(t=>{ if(!EX_VOCAB.has(t)) EX_VOCAB.set(t, 1); }));
const EX_SQUASH = [...EX_INDEX.values()].map(x=>x.squash).join("|");
const exKnown = (w, own) => [...EX_VOCAB.keys()].some(t=>t.startsWith(w)) || (w.length>=4 && EX_SQUASH.includes(w)) || own.some(x=>x.tokens.some(t=>t.startsWith(w)));
// The library word closest to a misspelled (maybe half-typed) word. Fewest edits wins; typos rarely
// change the first letter, whole words beat prefixes, and then the more common word wins.
function exFix(w){
  const k = w.length<=2 ? 0 : w.length<=4 ? 1 : w.length<=7 ? 2 : 3; if(!k) return null;
  let best = null, bc = Infinity, bf = 0;
  for(const [t,f] of EX_VOCAB){
    if(t.length<3) continue;
    const full = osa(w,t,k), pre = t.length>w.length ? Math.min(osa(w,t.slice(0,w.length),k), osa(w,t.slice(0,w.length+1),k)) : k+1;
    const d = Math.min(full, pre); if(d + (t[0]!==w[0] ? 1 : 0) > k) continue;
    const c = d + (t[0]!==w[0] ? .5 : 0) + (pre<full ? .25 : 0);
    if(c<bc || (c===bc && f>bf)){ best = t; bc = c; bf = f; }
  }
  return best;
}
// Returns {hits, fixed: the corrected search or null, partial: true when no name has every word}.
function findExercises(q, logged){
  const raw = exNorm(q).split(" ").filter(Boolean); if(!raw.length) return {hits:[]};
  const own = logged.map(entryFor);
  let changed = false;
  const words = raw.map(w=>{ if(exKnown(exStem(w), own)) return w; const t = exFix(exStem(w)); if(t){ changed = true; return t; } return w; });
  const fixed = changed ? words.join(" ") : null;
  const hits = rankExercises(fixed || q, logged);
  if(hits.length || words.length<2) return {hits, fixed};
  // Nothing has every word: show the names that match the most of them.
  const ws = exWords(fixed || q), seen = new Set();
  const scored = [...own, ...EX_INDEX.values()].filter(x=>!seen.has(x.name.toLowerCase()) && seen.add(x.name.toLowerCase()))
    .map(x=>({x, n: ws.filter(w=>wordFit(w,x)>=1).length, s: ws.reduce((a,w)=>a+wordFit(w,x),0)})).filter(r=>r.n);
  const top = Math.max(0, ...scored.map(r=>r.n));
  return {hits: scored.filter(r=>r.n===top).sort((a,b)=>b.s-a.s || a.x.words.length-b.x.words.length).map(r=>r.x), fixed, partial:true};
}
function rankExercises(q, logged){
  const ws = exWords(q); if(!ws.length) return [];
  const qkey = ws.join(" "), qsq = ws.join(""), mine = new Set(logged.map(n=>n.toLowerCase()));
  const seen = new Set(), out = [];
  const consider = x => {
    const l = x.name.toLowerCase(); if(seen.has(l)) return; seen.add(l);
    let s = 0;
    if(x.squash===qsq) s = 1000;
    else { for(const w of ws){ const v = wordFit(w, x); if(!v) return; s += v*10; } if(x.key.startsWith(qkey)) s += 50; }
    if(mine.has(l)) s += 15;
    out.push({x, s});
  };
  logged.forEach(n=>consider(entryFor(n)));
  EX_INDEX.forEach(consider);
  return out.sort((a,b)=>b.s-a.s || a.x.order-b.x.order).map(r=>r.x);   // ties keep the library's order (most standard first)
}
// Other muscles an exercise works: your own choice if you've set it, else the other groups the library lists it under.
// Muscles a lift also works, by its main group and name; the library lists most exercises under one group only.
const SECONDARY = [
  ["Chest", /press|push-up|\bdips?\b/, ["Shoulders","Triceps"]],
  ["Shoulders", /press|push-up/, ["Triceps"]],
  ["Triceps", /bench|press|\bdips?\b|push-up/, ["Chest"]],
  ["Back", /\brows?\b|pulldown|pull-up|chin-up/, ["Biceps"]],
  ["Back", /pullover/, ["Chest"]],
  ["Quadriceps", /squat|lunge|leg press|step-up|hack/, ["Glutes"]],
  ["Glutes", /squat|lunge|step-up/, ["Quadriceps"]],
  ["Glutes", /hip thrust|bridge/, ["Hamstrings"]],
  ["Hamstrings", /deadlift|\brdl\b|good morning/, ["Glutes","Lower back"]],
  ["Biceps", /hammer|reverse/, ["Forearms"]],
];
function alsoOf(name){
  const o = exSet(name), m = groupOf(name), l = name.toLowerCase();
  if(o && Array.isArray(o.also)) return o.also.filter(x=>MUSCLES.includes(x) && x!==m);
  const lib = ((EX_INDEX.get(l)||{}).muscles||[]).map(y=>y.m), rules = SECONDARY.filter(([g,re])=>g===m && re.test(l)).flatMap(r=>r[2]);
  return MUSCLES.filter(x=>x!==m && !TIMED.has(x) && (lib.includes(x) || rules.includes(x)));
}
const worksIn = (name, f) => groupOf(name)===f || alsoOf(name).includes(f);
// The muscle/subgroup a result is shown under: the filtered group if it's listed there, else your own grouping.
function shownIn(x, f, mine){
  if(exSet(x.name)){   // your own choice beats the library
    const m = groupOf(x.name), sub = y => (x.muscles.find(z=>z.m===y)||{}).sub || "";
    if(f && f!==m && alsoOf(x.name).includes(f)) return {m:f, sub:"Also works"};
    return {m, sub:sub(m)};
  }
  const hit = f && x.muscles.find(y=>y.m===f); if(hit) return hit;
  if(mine){ const m = groupOf(x.name); return x.muscles.find(y=>y.m===m) || {m, sub:""}; }
  return x.muscles[0];
}
const EX_LIMIT = 40;
let exShowAll = false;
function renderPicker(){
  const q = $("#exercise-search").value.trim(), f = gf(), logged = exercisesByRecent();
  const mine = new Set(logged.map(n=>n.toLowerCase()));
  const row = x => { const s = shownIn(x, f, mine.has(x.name.toLowerCase()));
    return `<button type="button" class="ex-opt" data-name="${esc(x.name)}" data-m="${esc(s.m)}"><span class="ex-n">${esc(x.name)}</span><span class="ex-m">${esc([s.m, s.sub].filter(Boolean).join(" · "))}</span></button>`; };
  const sec = t => `<p class="ex-sec">${esc(t)}</p>`;
  let html = "";
  if(!exNorm(q)){
    const recent = logged.filter(n=>!f || groupOf(n)===f).slice(0, 6);
    if(recent.length) html += sec("Recently used") + recent.map(n=>row(entryFor(n))).join("");
    if(f){
      const listed = n => !!n && CATALOG.some(g=>g.muscle===f && g.names.includes(n));
      const moved = Object.keys(settings.exercises).map(l=>logged.find(n=>n.toLowerCase()===l) || EX_INDEX.get(l)?.name).filter(Boolean);
      const own = [...new Set([...logged.filter(n=>!EX_INDEX.has(n.toLowerCase())), ...moved])]
        .filter(n=>worksIn(n, f) && !listed(EX_INDEX.get(n.toLowerCase())?.name)).sort((a,b)=>a.localeCompare(b));
      if(own.length) html += sec("My exercises") + own.map(n=>row(entryFor(n))).join("");
      CATALOG.filter(g=>g.muscle===f && g.names.length).forEach(g=>{
        const names = g.names.filter(n=>!exSet(n) || worksIn(n, f));
        if(names.length) html += sec(g.sub) + names.map(n=>row(EX_INDEX.get(n.toLowerCase()))).join("");
      });
    } else html += `<p class="ex-tip">Search by name, muscle or equipment, like “seated cable” or “rdl”. Or choose a muscle group above to browse.</p>`;
  } else {
    const {hits, fixed, partial} = findExercises(q, logged);
    if(fixed) html += `<button type="button" class="ex-fix" data-fix="${esc(fixed)}">Showing results for <b>${esc(fixed)}</b></button>`;
    if(partial && hits.length) html += sec("No exact match. Closest matches:");
    const inGroup = f ? hits.filter(x=>shownIn(x, f, mine.has(x.name.toLowerCase())).m===f) : hits;
    const others = f ? hits.filter(x=>!inGroup.includes(x)) : [];
    let room = exShowAll ? Infinity : EX_LIMIT;
    const take = l => { const t = l.slice(0, room); room -= t.length; return t; };
    const a = take(inGroup), b = take(others);
    html += a.map(row).join("");
    if(b.length) html += sec("In other groups") + b.map(row).join("");
    if(a.length+b.length < hits.length) html += `<button type="button" class="ex-more" data-show-all>Show all ${hits.length} matches</button>`;
  }
  html += `<button type="button" class="ex-opt ex-new" data-new><span class="ex-n">＋ ${q ? `Add “${esc(q)}” as a new exercise` : "New exercise"}</span></button>`;
  $("#ex-results").innerHTML = html;
}
// Either the search box and results, or the chosen exercise with a Change button.
function showPicker(open){ $("#ex-find").hidden = !open; $("#ex-chosen").hidden = open; }
function chooseExercise(name, m){
  restNext = null;
  $("#exercise").value = name; $("#new-ex-wrap").hidden = true; muscleTouched = false;
  $("#muscle").value = !exSet(name) && MUSCLES.includes(m) ? m : groupOf(name);
  $("#ex-chosen-name").textContent = name; chosenMeta(name);
  showPicker(false); applyFormKind(); supersetFor(name);
  if(isCardioForm()) prefillCardio(name); else prefill(name);
}
function chosenMeta(name){
  const m = $("#muscle").value, s = shownIn(entryFor(name), m, false);
  $("#ex-chosen-meta").textContent = [m, s.m===m ? s.sub : ""].filter(Boolean).join(" · ");
}
function chooseNew(name){
  restNext = null;
  $("#exercise").value = name; $("#new-ex-wrap").hidden = false;
  applyEquip({}, prefs.unit);
  $("#muscle").value = gf() || guessMuscle(name); muscleTouched = !!gf();
  $("#new-muscle-wrap").hidden = !!gf();
  $("#ex-chosen-name").textContent = "New exercise"; $("#ex-chosen-meta").textContent = "Name it below";
  showPicker(false); applyFormKind(); $("#exercise").focus();
}
$("#exercise-search").addEventListener("input", ()=>{ exShowAll = false; renderPicker(); });
$("#exercise-search").addEventListener("keydown", e=>{
  if(e.key!=="Enter" || !$("#exercise-search").value.trim()) return;
  e.preventDefault(); ($("#ex-results [data-name]") || $("#ex-results [data-new]")).click();
});
$("#ex-results").addEventListener("click", e=>{
  const b = e.target.closest("button"); if(!b) return;
  if(b.hasAttribute("data-show-all")){ exShowAll = true; renderPicker(); }
  else if(b.hasAttribute("data-fix")){ $("#exercise-search").value = b.dataset.fix; exShowAll = false; renderPicker(); $("#exercise-search").focus(); }
  else if(b.hasAttribute("data-new")) chooseNew($("#exercise-search").value.trim().replace(/\s+/g," "));
  else chooseExercise(b.dataset.name, b.dataset.m);
});
$("#ex-change").addEventListener("click", ()=>{
  $("#exercise").value = ""; $("#new-ex-wrap").hidden = true; $("#new-muscle-wrap").hidden = !!gf();
  $("#muscle").value = gf() || "Other"; muscleTouched = false; showLast("");
  showPicker(true); renderPicker(); applyFormKind();
  $("#exercise-search").focus();
});
$("#group-filter").addEventListener("change", ()=>{
  const v = gf(); prefs.group = v; savePrefs();
  const isNew = !$("#new-ex-wrap").hidden;
  const cur = $("#exercise").value.trim();
  if(isNew){ if(v){ $("#muscle").value = v; muscleTouched = true; } }
  else if(cur && v && groupOf(cur)!==v){
    $("#exercise").value = ""; $("#muscle").value = v; showLast(""); showPicker(true);
  }
  else if(!cur) $("#muscle").value = v || "Other";
  $("#new-muscle-wrap").hidden = !!v;
  exShowAll = false; renderPicker(); applyFormKind();
  if(isCardioForm()) renderCardioDetails(cardioTypeOf($("#exercise").value), readCardioVals());
});
$("#exercise").addEventListener("input", e=>{
  if(!muscleTouched && !gf()){ const was = isCardioForm(); $("#muscle").value = guessMuscle(e.target.value); if(was!==isCardioForm()) applyFormKind(); }
});
function fillSelect(sel, withAll){
  const names = exercisesByRecent();
  const cur = sel.value;
  const keep = names.includes(cur) ? cur : (!withAll && names.length ? names[0] : "");
  sel.innerHTML = (withAll?`<option value="">All exercises</option>`:"") + groupedOptions(names, keep);
  sel.value = keep;
}


function renderHistory(){
  fillSelect($("#hist-filter"), true);
  const f = $("#hist-filter").value.toLowerCase();
  const list = sorted().filter(e=>!f || e.exercise.toLowerCase()===f);
  if(!list.length){ $("#history").innerHTML = `<div class="panel"><p class="empty">Nothing logged yet. Your workouts will show up here by day.</p></div>`; return; }
  const days = new Map();
  list.forEach(e=>{ if(!days.has(e.date)) days.set(e.date,[]); days.get(e.date).push(e); });
  $("#history").innerHTML = [...days.entries()].reverse().map(([d,l])=>`<div class="panel" id="day-${d}"><div class="day-head"><p class="day-date">${niceDate(d)}</p>${d<today()?`<button type="button" class="edit" data-repeat="${d}" aria-label="Repeat the workout from ${niceDate(d)}">Repeat</button>`:""}</div>${groupHTML(l, true)}${dayTotalHTML(l)}</div>`).join("");
}
$("#hist-filter").addEventListener("change", renderHistory);

document.addEventListener("click", async e=>{
  const m = e.target.closest("[data-more]");
  if(m){ const row = m.closest(".set"), open = row.classList.toggle("open"); m.setAttribute("aria-expanded", String(open)); if(open) row.querySelector("[data-edit]").focus(); return; }
  const c = e.target.closest("[data-del-chain]");
  if(c){
    const gone = entries.filter(x=>x.chain===c.dataset.delChain);
    try{ await store.removeMany(gone.map(x=>x.id)); offerUndo(gone, "Drop set deleted."); }catch(err){ flash("Couldn't delete that drop set.", true); }
    return;
  }
  const b = e.target.closest("[data-del]"); if(!b) return;
  const gone = entries.filter(x=>x.id===b.dataset.del);
  try{ await store.remove(b.dataset.del); offerUndo(gone, gone.some(isCardio) ? "Entry deleted." : "Set deleted."); }catch(err){ flash("Couldn't delete that set.", true); }
});
// Deleting is instant; the note's Undo puts the entries back for a few seconds.
function offerUndo(gone, message){
  if(gone.length) toast(message, "Undo", ()=>store.add(gone.filter(g=>!entries.some(e=>e.id===g.id))), 8000);
}
