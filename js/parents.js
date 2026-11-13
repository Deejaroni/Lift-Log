// Lift Log: parent exercises and their variants. The library (js/exercise-library.js) lists every version of a
// movement by name ("Lat pulldown — wide overhand"); here each one becomes a variant of a parent exercise
// ("Lat pulldown") with details: equipment, attachment, width, grip, bench angle, position, one side, style.
// Each variant keeps the library name it came from (src), which still drives the movement picture, the
// equipment suggestion and the 3D posture. Plain data and functions, no DOM. See docs/DECISIONS.md.
import { CATALOG_TEXT } from "./exercise-library.js";

// The details a variant can have, in the order they show.
export const DIMS = [
  ["equip", "Equipment"], ["attach", "Attachment"], ["width", "Width"], ["grip", "Grip"], ["angle", "Bench angle"],
  ["pos", "Position"], ["side", "Arms / legs"], ["path", "Path"], ["style", "Style"],
];
const DIM_KEYS = DIMS.map(d => d[0]);

// Which parent a library name belongs to: [parent, name test, options], first match wins. Options: muscle (the
// library muscle group it must be under), not (names to leave out), equip (the equipment when the name doesn't
// say), force (always that equipment). Names that match none stay their own parent; mobility and cardio never group.
const FAMILIES = [
  ["Pull-up", /pull-up|chin-up/, {not: /scapular/, equip: "Bodyweight"}],
  ["Lat pulldown", /pulldown/, {not: /straight-arm/, equip: "Cable"}],
  ["Straight-arm pulldown", /straight-arm|cable pullover/, {equip: "Cable"}],
  ["Pullover", /pullover/, {equip: "Dumbbell"}],
  ["High row", /high-row machine|chest-supported high row/, {equip: "Machine"}],
  ["Seated row", /seated cable row|single-arm cable row|chest-supported cable row|^high cable row$|low cable row|cable row to|row machine|iso-lateral row|plate-loaded row|hammer row|unilateral row/, {equip: "Cable"}],
  ["Chest-supported row", /seal row|chest-supported dumbbell row|incline bench dumbbell row/, {equip: "Barbell"}],
  ["Bent-over row", /bent-over row|pendlay|barbell row|yates|snatch-grip row|one-arm dumbbell row|bilateral dumbbell row|neutral-grip dumbbell row|gorilla row/, {equip: "Barbell"}],
  ["Shrug", /shrug/, {equip: "Barbell"}],
  ["Y-raise", /y-raise/, {equip: "Dumbbell"}],
  ["Face pull", /face pull|rear-delt emphasis/, {equip: "Cable"}],
  ["Overhead press", /overhead press|shoulder press|behind-the-neck press|arnold press|dumbbell press — back supported|push press|bottoms-up kettlebell press/, {equip: "Barbell"}],
  ["Front raise", /front raise|scaption/, {equip: "Dumbbell"}],
  ["Lateral raise", /lateral raise/, {equip: "Dumbbell"}],
  ["Reverse fly", /reverse fly|rear-delt fly|reverse pec deck|rear-delt machine/, {equip: "Dumbbell"}],
  ["Biceps curl", /curl|21s/, {muscle: "Biceps", equip: "Barbell"}],
  ["Triceps pushdown", /pushdown|crossbody.*triceps extension/, {equip: "Cable", force: true}],
  ["Overhead triceps extension", /overhead.*extension|overhead triceps|bayesian cable triceps/, {equip: "Dumbbell"}],
  ["Skull crusher", /skull crusher|lying triceps extension|incline dumbbell triceps extension/, {equip: "Barbell"}],
  ["Triceps extension machine", /triceps extension machine|plate-loaded triceps extension/, {equip: "Machine"}],
  ["Dip", /\bdips?\b|dip machine/, {equip: "Bodyweight"}],
  ["Bench press", /bench press|close-grip bench|floor press|squeeze press|dumbbell press — neutral|decline (barbell|dumbbell) press/, {equip: "Barbell"}],
  ["Chest press", /chest press|machine press|plate-loaded incline press/, {equip: "Machine"}],
  ["Chest fly", /fly|pec deck|pec fly/, {not: /reverse|rear-delt/, equip: "Dumbbell"}],
  ["Push-up", /push-up/, {not: /pike|handstand/, equip: "Bodyweight"}],
  ["Leg press", /leg press/, {not: /calf/, equip: "Machine"}],
  ["Leg extension", /leg extension|single-leg extension/, {equip: "Machine"}],
  ["Calf raise", /calf raise|soleus/, {equip: "Machine"}],
  ["Step-up", /step-up/],
  ["Lunge", /lunge|split squat/],
  ["Squat", /squat/, {not: /squat thrust|cossack/, equip: "Barbell"}],
  ["Deadlift", /deadlift|\brdl\b|block pull/, {equip: "Barbell"}],
  ["Leg curl", /curl/, {muscle: "Hamstrings", not: /nordic hamstring|assisted nordic|slider|stability-ball/, equip: "Machine"}],
  ["Nordic curl", /nordic hamstring|assisted nordic|glute-ham/, {equip: "Bodyweight"}],
  ["Hip thrust", /hip thrust|glute bridge|glute drive/, {equip: "Barbell"}],
  ["Hip abduction", /abduction/, {equip: "Machine"}],
  ["Good morning", /good morning/, {equip: "Barbell"}],
  ["Back extension", /back extension/, {equip: "Bodyweight"}],
  ["Crunch", /crunch|ab machine/, {not: /bicycle/, equip: "Bodyweight"}],
  ["Sit-up", /sit-up/, {equip: "Bodyweight"}],
  ["Leg raise", /leg raise|knee raise|toes-to-bar|flutter/, {equip: "Bodyweight"}],
  ["Woodchop", /chop/, {equip: "Cable"}],
  ["Cable rotation", /cable rotation|pallof/, {equip: "Cable"}],
  ["Side bend", /side bend/, {equip: "Dumbbell"}],
  ["Russian twist", /russian twist/, {equip: "Bodyweight"}],
  ["Plank", /^plank$|side plank/, {equip: "Bodyweight"}],
  ["Reverse wrist curl", /reverse wrist curl/, {equip: "Barbell"}],
  ["Wrist curl", /wrist curl/, {equip: "Barbell"}],
  ["Carry", /farmer|suitcase/, {equip: "Dumbbell"}],
  ["Kettlebell swing", /swing/, {equip: "Kettlebell"}],
  ["Kettlebell clean", /kettlebell clean(?! and)/, {equip: "Kettlebell"}],
];

// Details read from a name: [dimension, value, test, keep]. Matched words are left out of the style unless keep.
// Attachments use the Equipment panel's names, so the two stay in step.
const TOKENS = [
  ["equip", "Smith machine", /\bsmith( machine)?\b/], ["equip", "Plate-loaded", /\bplate-loaded\b/],
  ["equip", "Machine", /\b(selectorized|machine|pec deck|converging|hammer-style)\b/], ["equip", "Machine", /\b(iso-lateral|pendulum|hack squat|v-squat|belt squat|leverage|glute drive)\b/, true],
  ["equip", "Cable", /\b(cable|dual-cable|pulley)\b/], ["equip", "Kettlebell", /\bkettlebells?\b/], ["equip", "Dumbbell", /\bdumbbells?\b/],
  ["equip", "Dumbbell", /\b(goblet|arnold|concentration|zottman|hammer curl)\b/, true],
  ["equip", "Barbell", /\bbarbell\b/], ["equip", "Barbell", /\b(ez-bar|trap bar|safety-bar|snatch-grip|pendlay|yates|high-bar|low-bar)\b/, true],
  ["equip", "Bodyweight", /\b(jump squat|pistol|shrimp|sissy|side-lying hip)\b/, true],
  ["equip", "Band", /\b(band|banded)\b/], ["equip", "Rings", /\b(rings?|suspension)\b/], ["equip", "Bodyweight", /\bbodyweight\b/],
  ["attach", "Rope pulldown", /\brope\b/], ["attach", "V bar", /\bv-bar\b/], ["attach", "Straight bar", /\b(straight[- ]bar|bar straight-arm)\b/],
  ["attach", "EZ bar", /\b(ez attachment|ez-bar)\b/], ["attach", "Trap bar", /\btrap bar\b/], ["attach", "Safety bar", /\bsafety-bar\b/],
  ["attach", "D grip", /\b(dual-handle|dual-cable)\b/],
  ["width", "Wide", /\b(wide(-grip|-stance)?|snatch-grip)\b/], ["width", "Close", /\b(close(-grip)?|narrow(-stance)?)\b/], ["width", "Medium", /\bmedium(-stance)?\b/],
  ["grip", "Overhand", /\b(overhand|pronated)\b/], ["grip", "Underhand", /\b(underhand|reverse-grip|supinated)\b/], ["grip", "Underhand", /\bchin-up\b/, true],
  ["grip", "Neutral", /\b(neutral(-grip)?|parallel grip|wrist-neutral|neutral\/semisupinated)\b/], ["grip", "Neutral", /\bhammer curl\b/, true],
  ["grip", "Overhand", /\breverse curl\b/, true],
  ["angle", "Flat", /\bflat( bench)?\b/], ["angle", "Slight incline", /\bslight incline\b/], ["angle", "Low incline", /\blow incline\b/],
  ["angle", "High incline", /\bhigh incline\b/], ["angle", "Incline", /\bincline( bench)?\b/], ["angle", "Decline", /\bdecline( bench)?\b/],
  ["side", "One arm", /\b(single-arm|one-arm)\b/], ["side", "One leg", /\bsingle-leg\b/],
  ["side", "Alternating", /\balternating\b/], ["side", "Both at once", /\b(simultaneous|bilateral)\b/], ["side", "Independent arms", /\b(iso-lateral|unilateral|independent)\b/],
  ["pos", "Seated", /\bseated\b/], ["pos", "Standing", /\bstanding\b/], ["pos", "Kneeling", /\bkneeling\b/], ["pos", "Side-lying", /\bside-lying\b/],
  ["pos", "Lying", /\blying( on bench)?\b/], ["pos", "Hanging", /\bhanging\b/], ["pos", "Chest-supported", /\b(chest-supported|prone)\b/],
  ["pos", "Bench supported", /\bbench supported\b/], ["pos", "Knee supported", /\bknee supported\b/], ["pos", "Unsupported", /\bunsupported\b/],
  ["pos", "Bent over", /\bbent-over\b/], ["pos", "Leaning", /\bleaning\b/], ["pos", "Behind the neck", /\bbehind-the-neck\b/],
  ["pos", "Behind the back", /\bbehind-the-(back|body)\b|\bbehind body\b/], ["pos", "In front of body", /\bin front of body\b/],
  ["pos", "Cross-body", /\b(cross-body|crossbody)\b/], ["pos", "Split stance", /\bsplit stance\b/], ["pos", "Floor", /\bfloor\b/],
  ["pos", "Back supported", /\bback supported\b/], ["pos", "Heels elevated", /\bheels? elevated\b|\bheel-elevated\b/], ["pos", "Feet forward", /\bfeet forward\b/],
  ["pos", "High foot", /\bhigh-foot\b/], ["pos", "Low foot", /\blow-foot\b/], ["pos", "45°", /45°/], ["pos", "Horizontal", /\bhorizontal\b/], ["pos", "Vertical", /\bvertical\b/],
  ["path", "Low to high", /\blow-to-high\b/], ["path", "High to low", /\bhigh-to-low\b/], ["path", "Low pulley", /\blow pulley\b/], ["path", "Mid pulley", /\bmid pulley\b/],
  ["path", "High pulley", /\bhigh pulley\b/], ["path", "To the hip", /\bto hip\b/], ["path", "To the upper chest", /\bto upper chest\b/],
  ["style", "On leg press", /\bleg press calf\b/], ["style", "On hack squat", /\bhack squat calf\b/], ["style", "Chin-up", /\bchin-up\b/],
  ["style", "Romanian", /\b(romanian|rdl)\b/], ["style", "Stiff-leg", /\bstiff-leg\b/], ["style", "Conventional", /\bconventional\b/], ["style", "Sumo", /\bsumo\b/],
  ["style", "Deficit", /\bdeficit\b/], ["style", "Block pull", /\bblock pull\b/], ["style", "B-stance", /\bb-stance\b/], ["style", "Staggered stance", /\bstaggered-stance\b/],
  ["style", "Paused", /\b(paused|pause)\b/], ["style", "Box", /\bbox\b/], ["style", "Front", /\bfront squat\b/, true], ["style", "High-bar", /\bhigh-bar\b/], ["style", "Low-bar", /\blow-bar\b/],
  ["style", "Goblet", /\bgoblet\b/], ["style", "Jump", /\b(jump|jumping)\b/], ["style", "Pistol", /\bpistol\b/], ["style", "Shrimp", /\bshrimp\b/], ["style", "Sissy", /\bsissy\b/],
  ["style", "Hack", /\bhack\b(?! squat calf)/], ["style", "Pendulum", /\bpendulum\b/], ["style", "V-squat", /\bv-squat\b/], ["style", "Belt", /\bbelt\b/], ["style", "Leverage", /\bleverage\b/],
  ["style", "Assisted", /\b(machine-)?assisted\b/], ["style", "Weighted", /\bweighted\b/], ["style", "Archer", /\barcher\b/], ["style", "Clap", /\bclap\b/],
  ["style", "Diamond", /\bdiamond\b/], ["style", "Knee", /\bknee push-up\b/], ["style", "Parallel bars", /\bparallel bar\b/], ["style", "Chest emphasis", /\bchest (emphasis|dips)\b/],
  ["style", "Bulgarian split squat", /\bbulgarian split squat\b/], ["style", "Split squat", /\bsplit squat\b/], ["style", "Front foot elevated", /\bfront-foot-elevated\b/], ["style", "Reverse", /\breverse (lunge|crunch)\b/],
  ["style", "Walking", /\bwalking\b/], ["style", "High", /\bhigh step-up\b/], ["style", "Glute bridge", /\bglute bridge\b/], ["style", "Preacher", /\bpreacher\b/], ["style", "Spider", /\bspider\b/],
  ["style", "Concentration", /\bconcentration\b/], ["style", "Drag", /\bdrag\b/], ["style", "Zottman", /\bzottman\b/], ["style", "Bayesian", /\bbayesian(-style)?\b/],
  ["style", "21s", /\b21s\b/], ["style", "Hammer", /\bhammer curl\b/], ["style", "Reverse", /\breverse curl\b/], ["style", "Arnold", /\barnold\b/], ["style", "Push press", /\bpush press\b/],
  ["style", "Bottoms-up", /\bbottoms-up\b/], ["style", "Seal", /\bseal\b/], ["style", "Pendlay", /\bpendlay\b/], ["style", "Yates", /\byates\b/], ["style", "Gorilla", /\bgorilla\b/],
  ["style", "T-bar", /\bt-bar\b/], ["style", "Low row", /\blow row\b/], ["style", "Pallof press", /\bpallof\b/], ["style", "Donkey", /\bdonkey\b/], ["style", "Soleus", /\bsoleus\b/],
  ["style", "Bent knees", /\bbent knees\b/], ["style", "Toes straight", /\btoes straight\b/], ["style", "Toes out", /\btoes slightly outward\b/], ["style", "Toes in", /\btoes slightly inward\b/],
  ["style", "Full range", /\bfull-rom\b/], ["style", "Toes to bar", /\btoes-to-bar\b/], ["style", "Flutter kicks", /\bflutter\b/], ["style", "Knee raise", /\bknee raise\b/],
  ["style", "With rotation", /\bwith rotation\b/], ["style", "External rotation", /\bexternal rotation\b/], ["style", "Rear-delt", /\brear-delt\b/], ["style", "Glute emphasis", /\bglute emphasis\b/],
  ["style", "Reverse hyper", /\breverse hyperextension\b/], ["style", "Squeeze", /\bsqueeze\b/], ["style", "Scaption", /\bscaption\b/], ["style", "Farmer's", /\bfarmer'?s\b/],
  ["style", "Suitcase", /\bsuitcase\b/], ["style", "Two-hand", /\btwo-hand\b/], ["style", "American", /\bamerican\b/], ["style", "Double", /\bdouble\b/], ["style", "Nordic", /\bnordic curl machine\b/],
  ["style", "Glute-ham", /\bglute-ham\b/], ["style", "Side", /\bside plank\b/], ["style", "Plate", /\bplate sit-up\b/], ["style", "Bar", /\bbar straight-arm\b/, true],
];
// Names whose words mislead the rules.
const OVERRIDE = {"hammer row": {equip: "Plate-loaded", grip: "Neutral"}, "ez-bar pushdown": {attach: "EZ bar"}, "parallel bar dips": {style: "Parallel bars"},
  "dips — chest emphasis": {style: "Chest emphasis"}, "high-row machine": {equip: "Machine"}, "glute bridge": {equip: "Bodyweight"},
  "single-leg glute bridge": {equip: "Bodyweight"}, "nordic hamstring curl": {style: ""}};
// Plain cable attachments by movement, as the Equipment panel names them.
function attachFor(n){
  if(/straight-arm|pushdown/.test(n)) return "Straight bar";
  if(/pulldown/.test(n)) return /neutral|parallel/.test(n) ? "Neutral-grip lat bar" : /single-arm|one-arm/.test(n) ? "D grip" : "Lat pulldown bar";
  if(/seated cable row/.test(n)) return /wide|overhand|underhand/.test(n) ? "Straight bar" : "Close-grip V handle";
  if(/single-arm|one-arm/.test(n)) return "D grip";
  return null;
}
const SHORT = {"Lat pulldown bar": "Lat bar", "Neutral-grip lat bar": "Neutral bar", "Close-grip V handle": "V handle", "Rope pulldown": "Rope"};
const title = s => s ? s[0].toUpperCase() + s.slice(1) : s;

function familyOf(m, sub, name){
  if(m === "Mobility" || m === "Cardio") return null;
  const n = name.toLowerCase();
  for(const [parent, re, o = {}] of FAMILIES) if(re.test(n) && (!o.muscle || o.muscle === m) && (!o.not || !o.not.test(n))) return [parent, o];
  return null;
}
// The details in a library name. Leftover words (when no style word matched) become the style.
function detailsOf(name, parent, o = {}){
  const low = name.toLowerCase();
  let n = ` ${low} `;
  const v = {}, styles = [];
  for(const [dim, val, re, keep] of TOKENS){
    if(!re.test(n)) continue;
    if(dim === "style"){ if(!styles.includes(val)) styles.push(val); }
    else if(!v[dim]) v[dim] = val;
    if(!keep) n = n.replace(re, " ");
  }
  if(styles.length) v.style = styles.join(", ");
  else if(parent){
    for(const w of parent.toLowerCase().split(/[\s-]+/)) n = n.replace(new RegExp(`\\b${w.replace(/[^a-z0-9]/g, "")}\\w*\\b`, "g"), " ");
    const rest = n.replace(/\b(with|and|the|of|to|a|grip|press|curl|raise|row|machine|emphasis|bench|shoulder|triceps|extension|pec|on|ab|calf|chop|bar)\b/g, " ")
      .replace(/[—–,()\/]|(^|\s)-+(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();
    if(rest && /[a-z]{2}/.test(rest)) v.style = title(rest);
  }
  Object.assign(v, OVERRIDE[low] || {});
  if(o.force || !v.equip){ if(o.equip) v.equip = o.equip; }
  if(v.attach && !["Cable"].includes(v.equip) && /Rope|V bar|D grip|Straight bar/.test(v.attach) && !o.force && v.equip !== "Machine") v.equip = "Cable";
  if(v.equip === "Cable" && !v.attach){ const a = attachFor(low); if(a) v.attach = a; }
  for(const k in v) if(!v[k]) delete v[k];
  return v;
}

// ---------- the parents ----------
// LIB: every library name -> {parent, m, sub, v}. PARENTS: parent name -> {name, m, sub, variants: [{src, m, sub, v}], dims}.
const LIB = new Map(), PARENTS = new Map();
{
  let m = null, sub = null;
  for(const raw of CATALOG_TEXT.split("\n")){
    const l = raw.trim(); if(!l) continue;
    if(l.startsWith("## ")){ sub = l.slice(3); continue; }
    if(l.startsWith("# ")){ m = l.slice(2); sub = null; continue; }
    const name = l.split("|")[0].trim();
    if(LIB.has(name.toLowerCase())) continue;
    const fam = familyOf(m, sub, name), parent = fam ? fam[0] : name, v = fam ? detailsOf(name, parent, fam[1]) : {};
    LIB.set(name.toLowerCase(), {src: name, parent, m, sub, v});
    if(!PARENTS.has(parent)) PARENTS.set(parent, {name: parent, m, sub, variants: []});
    PARENTS.get(parent).variants.push({src: name, m, sub, v});
  }
  // Each parent's choices for each detail: the values its variants use, plus the usual ones for width and grip.
  for(const p of PARENTS.values()){
    p.dims = {};
    for(const k of DIM_KEYS){
      const vals = [...new Set(p.variants.map(x => x.v[k]).filter(Boolean))];
      if(vals.length) p.dims[k] = vals;
    }
    if(p.dims.width) p.dims.width = [...new Set(["Close", "Medium", "Wide", ...p.dims.width])];
    if(p.dims.grip) p.dims.grip = [...new Set(["Overhand", "Underhand", "Neutral", ...p.dims.grip])];
  }
}

// ---------- lookups ----------
const parentOf = name => (LIB.get((name || "").toLowerCase()) || {}).parent || name;
const parentInfo = name => PARENTS.get(name) || null;
// The library entry a parent + variant stands for: the variant with the most matching details (ties go to the
// first one listed, which is the plainest).
function sourceFor(parent, v = {}){
  const p = PARENTS.get(parent); if(!p) return null;
  let best = null, score = -1;
  for(const x of p.variants){
    let s = 0;
    for(const k of DIM_KEYS){ if(x.v[k] && v[k] === x.v[k]) s += 2; else if(x.v[k] && v[k] && v[k] !== x.v[k]) s -= 1; else if(x.v[k] && !v[k]) s -= .5; }
    if(s > score){ score = s; best = x; }
  }
  return best;
}
// The library name to use for pictures, hints and standards: the parent's best-matching variant, else the name itself.
const srcFor = (name, v) => { const p = PARENTS.get(name); if(!p || p.variants.length < 2 && p.variants[0].src === name) return name; return (sourceFor(name, v) || {}).src || name; };
// Turns an old-style entry (a library name) into parent + variant; returns null when it's already a parent or your own name.
function toParent(name, v){
  const x = LIB.get((name || "").toLowerCase());
  if(!x || x.parent === x.src) return null;
  return {exercise: x.parent, variant: cleanVariant({...x.v, ...(v || {})})};
}
// A variant as words: "Cable · Lat bar · Wide overhand · Seated".
function variantLabel(v){
  if(!v) return "";
  const grip = [v.width, v.grip && v.width ? v.grip.toLowerCase() : v.grip].filter(Boolean).join(" ");
  return [v.equip, SHORT[v.attach] || v.attach, v.angle, grip, v.pos, v.side, v.path, v.style].filter(Boolean).join(" · ");
}
const variantKey = v => DIM_KEYS.map(k => (v && v[k]) || "").join("|");
// Only the details a variant has, in a fixed order (so equal variants compare equal).
const cleanVariant = v => { const o = {}; for(const k of DIM_KEYS) if(v && v[k]) o[k] = v[k]; return o; };

export { srcFor, toParent, SHORT, LIB, PARENTS, parentOf, parentInfo, sourceFor, variantLabel, variantKey, cleanVariant, detailsOf, familyOf, DIM_KEYS };
