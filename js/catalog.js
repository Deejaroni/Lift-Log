// Lift Log: Muscle groups: reading the library, guessing a muscle from a name, and grouping exercises.
// ES module. Its start-up code runs in init(), which js/app.js calls in a fixed order (see docs/DECISIONS.md).

import { $ } from "./ui.js";
import { prefs, settings } from "./state.js";
import { esc, sorted } from "./log.js";
import { applyFormKind, cardioTypeOf, isCardioForm, readCardioVals, renderCardioDetails } from "./equipment.js";
import { CATALOG_TEXT } from "./exercise-library.js";

// ---------- muscle groups & exercise dropdown ----------
const MUSCLES = ["Cardio","Mobility","Chest","Back","Shoulders","Biceps","Triceps","Quadriceps","Hamstrings","Glutes","Calves","Abdominals","Lower back","Forearms","Full body","Other"];
const CATALOG = []; // {muscle, sub, names[]}
const CAT_MUSCLE = new Map(); // lowercased name -> first muscle it appears under
const CARDIO_TYPE = new Map(); // lowercased cardio name -> activity type
const BW_NAMES = new Set();     // lowercased names of bodyweight exercises
const GUESS = [
  [/stretch|mobility|foam roll|\byoga\b|cat-cow|child's pose/, "Mobility"],
  [/farmer|suitcase carry/, "Forearms"],
  [/treadmill|stationary bike|spin bike|air bike|recumbent|cycling|\bbike\b|rowing machine|\brower\b|ski ?erg|elliptical|stair ?climber|stepmill|\brun\b|running|\bjog|\bwalk\b(?!ing lunge)|hike|hiking|ruck|swim|jump ?rope|\bhiit\b|cardio|sprint|interval/, "Cardio"],
  [/calf|calves|soleus/, "Calves"],
  [/wrist|forearm|grip|farmer|suitcase|dead ?hang|plate pinch/, "Forearms"],
  [/leg raise|knee raise|crunch|plank|\babs?\b|ab wheel|core|oblique|sit.?up|russian twist|wood.?chop|pallof|hollow|side bend/, "Abdominals"],
  [/good ?morning|back extension|hyperextension/, "Lower back"],
  [/leg curl|hamstring|nordic|\brdl\b|romanian|stiff.?leg|pull.?through/, "Hamstrings"],
  [/hip thrust|glute|abduct|bridge|donkey kick|split squat|lunge|step.?up/, "Glutes"],
  [/leg extension|leg press|squat|hack|quad|sissy|adductor/, "Quadriceps"],
  [/tricep|pushdown|push.?down|skull|kickback|close.?grip|\bdips?\b|jm press|overhead extension|french press/, "Triceps"],
  [/curl|bicep|preacher|hammer|spider|\b21s\b/, "Biceps"],
  [/shoulder|delt|lateral raise|side raise|front raise|overhead press|\bohp\b|military|arnold|upright row|face pull|reverse fly|reverse pec/, "Shoulders"],
  [/bench|chest|\bfly\b|flye|\bflies\b|pec|push.?up|incline|decline|crossover|svend/, "Chest"],
  [/deadlift|clean|snatch|thruster|burpee|kettlebell swing/, "Full body"],
  [/\brows?\b|rowing|pull.?down|pull.?up|\bchin|\blats?\b|shrug|pullover|\btraps?\b|y.?raise|rack pull/, "Back"],
];
const guessMuscle = name => { const n=(name||"").toLowerCase(); for(const [re,g] of GUESS){ if(re.test(n)) return g; } return "Other"; };
// Older entries used "Legs" and "Core"
const normMuscle = (m, name) => MUSCLES.includes(m) ? m : m==="Core" ? "Abdominals" :
  m==="Legs" ? (/curl|hamstring|rdl|romanian|stiff|nordic|good ?morning/.test((name||"").toLowerCase()) ? "Hamstrings" : "Quadriceps") : (CAT_MUSCLE.get((name||"").toLowerCase()) || guessMuscle(name));
const exSet = name => settings.exercises[(name||"").toLowerCase()];
const groupOf = name => {
  const o = exSet(name); if(o && MUSCLES.includes(o.muscle)) return o.muscle;
  const l=(name||"").toLowerCase();
  const e = sorted().reverse().find(x=>x.exercise.toLowerCase()===l && x.muscle);
  return e ? normMuscle(e.muscle, name) : (CAT_MUSCLE.get(l) || guessMuscle(name));
};
const opt = (n, m, sel) => `<option value="${esc(n)}" data-m="${esc(m)}" ${sel?"selected":""}>${esc(n)}</option>`;
const matchQ = (n, q) => !q || q.split(/\s+/).every(w=>n.toLowerCase().includes(w));
// Used by History and Progress: only exercises you've logged, grouped by muscle
function groupedOptions(names, selected){
  const by = new Map(MUSCLES.map(m=>[m,[]]));
  names.forEach(n=>{ const g=groupOf(n); if(!by.has(g)) by.set(g,[]); by.get(g).push(n); });
  return [...by.entries()].filter(([,l])=>l.length).map(([g,l])=>`<optgroup label="${esc(g)}">${l.sort((a,b)=>a.localeCompare(b)).map(n=>opt(n,g,n===selected)).join("")}</optgroup>`).join("");
}
const gf = ()=> $("#group-filter").value;
let muscleTouched = false;
// Setters for values other files change.
function setMuscleTouched(v){ muscleTouched = v; }

export function init(){
  (function(){
    let m=null, g=null; const seenInMuscle = new Set();
    CATALOG_TEXT.split("\n").forEach(line=>{
      line=line.trim(); if(!line) return;
      if(line.startsWith("## ")){ g={muscle:m, sub:line.slice(3), names:[]}; CATALOG.push(g); }
      else if(line.startsWith("# ")){ m=line.slice(2); seenInMuscle.clear(); }
      else if(g){
        let type=null; if(line.includes("|")){ [line, type] = line.split("|").map(x=>x.trim()); }
        const k=line.toLowerCase();
        if(type) CARDIO_TYPE.set(k, type);
        if(/bodyweight|pull-ups/i.test(g.sub) || (/\bdips?\b|push-up|pull-up|chin-up|muscle-up|\bhangs?\b/.test(k) && !/assisted|machine/.test(k))) BW_NAMES.add(k);
        if(seenInMuscle.has(k)) return;           // same exercise listed twice under one muscle
        seenInMuscle.add(k); g.names.push(line);
        if(!CAT_MUSCLE.has(k)) CAT_MUSCLE.set(k, m);
      }
    });
  })();
  $("#muscle").innerHTML = MUSCLES.map(m=>`<option>${m}</option>`).join("");
  $("#group-filter").innerHTML = `<option value="">All muscle groups</option>` + MUSCLES.map(m=>`<option>${m}</option>`).join("");
  if(prefs.group && MUSCLES.includes(prefs.group)) $("#group-filter").value = prefs.group;
  $("#muscle").value = $("#group-filter").value || "Other";
  $("#new-muscle-wrap").hidden = !!gf();
  $("#muscle").addEventListener("change", ()=>{ muscleTouched = true; applyFormKind(); if(isCardioForm()) renderCardioDetails(cardioTypeOf($("#exercise").value), readCardioVals()); });
}

export { MUSCLES, CATALOG, CAT_MUSCLE, CARDIO_TYPE, BW_NAMES, GUESS, guessMuscle, normMuscle, exSet, groupOf, opt, matchQ, groupedOptions, gf, muscleTouched, setMuscleTouched };
