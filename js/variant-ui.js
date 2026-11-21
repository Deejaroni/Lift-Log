// Lift Log: the variant tracker on the Log tab. Under the chosen exercise, a row of chips shows its variant
// (equipment, attachment, width, grip, position...); tapping one opens the choices for every detail. The form
// reads the variant from here when a set is saved. ES module; js/app.js calls init() in its fixed order.
import { $ } from "./ui.js";
import { entries } from "./state.js";
import { PARENTS, DIMS, SHORT, cleanVariant } from "./parents.js";

let curName = "", cur = {}, onChange = null;
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const CORE = ["equip", "attach", "width", "grip", "pos"];

// A parent with more than one variant gets the tracker; your own exercises and one-off moves don't.
const hasVariants = name => { const p = PARENTS.get(name); return !!p && p.variants.length > 1 && Object.keys(p.dims).length > 0; };
const currentVariant = () => ({...cur});
// The variant of the latest set of an exercise (or null).
function lastVariantOf(name){
  const l = (name || "").toLowerCase(); let best = null;
  for(const e of entries) if(e.variant && e.exercise.toLowerCase() === l && (!best || e.date > best.date || (e.date === best.date && (e.ts || 0) > (best.ts || 0)))) best = e;
  return best ? best.variant : null;
}
// What a fresh pick shows: the variant you used last, else the library's plainest one.
const defaultVariant = name => lastVariantOf(name) || (PARENTS.get(name)?.variants[0].v) || {};

// Choices for one detail, given the equipment chosen in v: what goes with that equipment, your own past choices first.
function choices(name, dim, v = cur){
  const p = PARENTS.get(name); if(!p) return [];
  const all = p.dims[dim] || [];
  const withEquip = dim !== "equip" && v.equip ? new Set(p.variants.filter(x => x.v.equip === v.equip).map(x => x.v[dim]).filter(Boolean)) : null;
  let list = withEquip ? all.filter(v => withEquip.has(v) || (dim === "width" || dim === "grip")) : all;
  if(dim === "attach" && withEquip && !withEquip.size) list = [];
  const used = new Map();
  entries.forEach(e => { if(e.exercise === name && e.variant && e.variant[dim]) used.set(e.variant[dim], (used.get(e.variant[dim]) || 0) + 1); });
  return [...list].sort((a, b) => (used.get(b) || 0) - (used.get(a) || 0));
}
const label = (dim, v) => dim === "attach" ? (SHORT[v] || v) : v;

// The chips for variant v of an exercise (the set editor in js/entries.js uses these too).
function chipsHTML(name, v){
  const dims = DIMS.filter(([k]) => choices(name, k, v).length || v[k]);
  const set = dims.filter(([k]) => v[k]).map(([k]) => `<button type="button" class="vchip" data-vdim="${k}" aria-pressed="true">${esc(label(k, v[k]))}<span class="vcaret" aria-hidden="true"> ▾</span></button>`);
  const unset = dims.filter(([k]) => !v[k]);
  const core = unset.filter(([k]) => CORE.includes(k)).map(([k, t]) => `<button type="button" class="vchip" data-vdim="${k}" aria-pressed="false">+ ${esc(t)}</button>`);
  const more = unset.some(([k]) => !CORE.includes(k)) ? [`<button type="button" class="vchip" data-vdim="" aria-pressed="false">+ More</button>`] : [];
  return [...set, ...core, ...more].join("");
}
// Every detail with its choices; tapping a chosen one again clears it. idp prefixes the row ids.
function choicesHTML(name, v, idp = "vrow"){
  return DIMS.map(([k, t]) => {
    const opts = choices(name, k, v); if(v[k] && !opts.includes(v[k])) opts.unshift(v[k]);
    if(!opts.length) return "";
    return `<div class="vrow" id="${idp}-${k}">${esc(t)}</div><div class="vopts">${opts.map(o => `<button type="button" class="vopt" data-dim="${k}" data-val="${esc(o)}" aria-pressed="${v[k] === o}">${esc(label(k, o))}</button>`).join("")}</div>`;
  }).join("");
}
// v with one detail picked (or cleared, if it was already chosen). New equipment drops an attachment that doesn't fit.
function pick(name, v, dim, val){
  const n = {...v, [dim]: v[dim] === val ? undefined : val};
  if(dim === "equip" && n.attach && !choices(name, "attach", n).includes(n.attach)) n.attach = undefined;
  return cleanVariant(n);
}
function renderChips(){
  const wrap = $("#ex-variant"), edit = $("#ex-vedit");
  if(!hasVariants(curName)){ wrap.hidden = true; edit.hidden = true; return; }
  wrap.innerHTML = chipsHTML(curName, cur);
  wrap.hidden = false;
  if(!edit.hidden) renderEdit();
}
function renderEdit(focus){
  $("#ex-vedit-body").innerHTML = choicesHTML(curName, cur);
  if(focus) $(`#vrow-${focus}`)?.scrollIntoView({block: "nearest"});
}

// Sets the exercise and variant the tracker shows (and saves with the next set).
function setVariant(name, v){
  curName = name || ""; cur = cleanVariant(v || {});
  $("#ex-vedit").hidden = true;
  renderChips();
}
function openEdit(dim){ $("#ex-vedit").hidden = false; renderEdit(dim); $("#ex-vedit-done").focus({preventScroll: true}); }
function closeEdit(){ $("#ex-vedit").hidden = true; renderChips(); }
// fn(variant, changedDim) runs after the variant changes (the form then updates equipment and the picture).
const onVariantChange = fn => { onChange = fn; };

export function init(){
  $("#ex-variant").addEventListener("click", e => { const b = e.target.closest("[data-vdim]"); if(b) openEdit(b.dataset.vdim); });
  $("#ex-vedit").addEventListener("click", e => {
    const b = e.target.closest("[data-dim]"); if(!b) return;
    const {dim, val} = b.dataset;
    cur = pick(curName, cur, dim, val);
    renderEdit(); renderChips();
    if(onChange) onChange(currentVariant(), dim);
  });
  $("#ex-vedit-done").addEventListener("click", closeEdit);
}

export { chipsHTML, choicesHTML, pick, hasVariants, currentVariant, lastVariantOf, defaultVariant, setVariant, onVariantChange, closeEdit };
