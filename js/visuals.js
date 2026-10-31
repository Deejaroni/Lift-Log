// Lift Log: exercise visuals for the app: which pattern and muscles to show for an exercise, cached stills,
// and the animation loop for figures on screen. ES module (see docs/DECISIONS.md).
import { PATTERNS, patternKey, kindOf, deltHead } from "./movements.js";
import { figureMarkup, bodyMapMarkup, poseBox, FIGURE_VIEWBOX } from "./figure.js";
import { groupOf } from "./catalog.js";
import { EX_INDEX, alsoOf } from "./search.js";

const TIMED = new Set(["Cardio","Mobility"]);
const headLabel = h => `${h[0].toUpperCase()}${h.slice(1)} delts`;

// Everything the visuals need for one exercise. Muscles follow your own choices (groupOf / alsoOf).
function visualFor(name){
  const main = groupOf(name), e = EX_INDEX.get(name.toLowerCase());
  const lib = e && (e.muscles.find(x=>x.m===main) || e.muscles[0]);
  if(TIMED.has(main)) return {timed:true, main, also:[], roles:{}};
  const key = patternKey(name, lib ? lib.m : main, lib ? lib.sub : ""), pat = key ? PATTERNS[key] : null;
  const head = main==="Shoulders" ? deltHead(lib && lib.m==="Shoulders" ? lib.sub : "", key) : null;
  const also = alsoOf(name).filter(m=>!TIMED.has(m));
  const tag = (m, h) => m==="Shoulders" && h ? `Shoulders:${h}` : m;
  const roles = {[tag(main, head)]: 1};
  also.forEach(m=>{ const t = tag(m, m==="Shoulders" ? (pat && pat.head) : null); if(!roles[t]) roles[t] = .38; });
  const label = (m, h) => m==="Shoulders" && h ? headLabel(h) : m;
  return {key, pat, kind: kindOf(name), roles, main: label(main, head), also: also.map(m=>label(m, m==="Shoulders" && pat ? pat.head : null))};
}

// A small picture for lists: the movement's end position, or the body map when there's no animation yet.
const stills = new Map();
function stillMarkup(name, size=[40,36]){
  const v = visualFor(name);
  if(v.timed) return "";
  const id = `${v.key}|${v.kind}|${JSON.stringify(v.roles)}|${size}`;
  if(!stills.has(id)) stills.set(id, v.pat
    ? `<svg viewBox="${poseBox(v.pat)}" width="${size[0]}" height="${size[1]}" aria-hidden="true" focusable="false">${figureMarkup(v.pat, 1, v.roles, v.kind, {noShadow:true})}</svg>`
    : `<svg viewBox="0 0 58 44" width="${size[0]}" height="${size[1]}" aria-hidden="true" focusable="false">${bodyMapMarkup(v.roles)}</svg>`);
  return stills.get(id);
}

// A still for a movement on its own (browse tiles), with every muscle it shows.
function patternStill(key){
  const id = `pattern|${key}`, p = PATTERNS[key];
  const roles = Object.fromEntries([...(p.bands||[]).map(b=>[b.m,1]), ...(p.regions||[]).map(r=>[r[1],1])]);
  if(!stills.has(id)) stills.set(id, `<svg viewBox="${poseBox(p)}" width="44" height="40" aria-hidden="true" focusable="false">${figureMarkup(p, 1, roles, "barbell", {noShadow:true})}</svg>`);
  return stills.get(id);
}

// ---------- animation loop: one requestAnimationFrame for every figure on screen ----------
const live = new Map();   // svg element -> visual
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let raf = 0, last = 0;
const ease = u => u<.5 ? 4*u*u*u : 1-Math.pow(-2*u+2,3)/2;
// One rep every 3.2 s: hold at the start, move, hold at the end, return.
function phase(ms){ const u=(ms/3200)%1; if(u<.08) return 0; if(u<.46) return ease((u-.08)/.38); if(u<.58) return 1; if(u<.94) return 1-ease((u-.58)/.36); return 0; }
function draw(svg, v, t){ svg.innerHTML = figureMarkup(v.pat, t, v.roles, v.kind); }
function tick(now){
  raf = 0;
  if(now-last >= 32){ last = now;   // about 30 frames a second is plenty for these
    for(const [svg, v] of live){ if(!svg.isConnected){ live.delete(svg); continue; } if(svg.getClientRects().length) draw(svg, v, phase(now)); }
  }
  if(live.size) raf = requestAnimationFrame(tick);
}
// tight: crop to the body (small pictures); otherwise the whole scene with its equipment.
function animate(svg, v, tight=false){
  svg.setAttribute("viewBox", tight ? poseBox(v.pat, [0,.5,1]) : FIGURE_VIEWBOX);
  if(reduceMotion()){ live.delete(svg); draw(svg, v, 1); svg.dataset.still = "1"; return; }   // a still of the end position
  delete svg.dataset.still; live.set(svg, v); draw(svg, v, 0);
  if(!raf) raf = requestAnimationFrame(tick);
}
const stopAnimating = svg => live.delete(svg);

export { visualFor, stillMarkup, patternStill, animate, stopAnimating, bodyMapMarkup, FIGURE_VIEWBOX };
