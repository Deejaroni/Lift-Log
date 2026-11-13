// Lift Log: exercise visuals for the app: which pattern and muscles to show for an exercise, cached stills,
// and the animation loop for figures on screen. ES module (see docs/DECISIONS.md).
import { PATTERNS, patternKey, kindOf, deltHead } from "./movements.js";
import { figureMarkup, bodyMapMarkup, poseBox, FIGURE_VIEWBOX } from "./figure.js";
import { groupOf } from "./catalog.js";
import { EX_INDEX, alsoOf } from "./search.js";
import { pose3dFor } from "./variants3d.js";
import { srcFor } from "./parents.js";
import { exSet } from "./catalog.js";
import { defaultVariant } from "./variant-ui.js";

const TIMED = new Set(["Cardio","Mobility"]);
const headLabel = h => `${h[0].toUpperCase()}${h.slice(1)} delts`;

// Everything the visuals need for one exercise. Muscles follow your own choices (groupOf / alsoOf).
// For a parent exercise, the picture is its variant's (by default the one you used last).
function visualFor(name, variant){
  const src = srcFor(name, variant || defaultVariant(name)), own = !!exSet(name);
  const main = groupOf(name), e = EX_INDEX.get(src.toLowerCase());
  const lib = e && (e.muscles.find(x=>x.m===main) || e.muscles[0]);
  const key = patternKey(src, lib ? lib.m : main, lib ? lib.sub : ""), pat = key ? PATTERNS[key] : null;
  // Cardio machines have a picture but no muscles; other cardio and mobility have neither.
  if(TIMED.has(main)) return {timed:true, key, key3d: pose3dFor(key, src, "none").key, pat, kind:"none", main, also:[], roles:{}};
  const head = main==="Shoulders" ? deltHead(lib && lib.m==="Shoulders" ? lib.sub : "", key) : null;
  const also = alsoOf(own ? name : src).filter(m=>!TIMED.has(m));
  const tag = (m, h) => m==="Shoulders" && h ? `Shoulders:${h}` : m;
  const roles = {[tag(main, head)]: 1};
  also.forEach(m=>{ const t = tag(m, m==="Shoulders" ? (pat && pat.head) : null); if(!roles[t]) roles[t] = .38; });
  // "Full body" isn't a muscle the figure can show, so light up every muscle the movement itself shows.
  if(main==="Full body" && pat) [...(pat.bands||[]).map(b=>b.m), ...(pat.regions||[]).map(x=>x[1])].forEach(m=>{ roles[m] = 1; });
  const label = (m, h) => m==="Shoulders" && h ? headLabel(h) : m;
  const kind = kindOf(src), p3 = pose3dFor(key, src, kind);
  return {src, key, pat, kind, key3d: p3.key, kind3d: p3.kind, roles, main: label(main, head), also: also.map(m=>label(m, m==="Shoulders" && pat ? pat.head : null))};
}

// ---------- 3D figures (js/figure3d.js), loaded on demand; the 2D drawings stay as the fallback ----------
// Where WebGL works, pictures are canvases the 3D engine draws into, once it has loaded (three.js and the body
// model are about 2.7 MB, cached for offline use). Until then, or if it can't load, the 2D figures show.
let has3d = null, engine = null, failed = false;
function can3d(){
  if(has3d !== null) return has3d;
  try { const c = document.createElement("canvas"), gl = c.getContext("webgl2") || c.getContext("webgl"); has3d = !!gl; gl?.getExtension("WEBGL_lose_context")?.loseContext(); }
  catch { has3d = false; }
  return has3d;
}
function load3d(){
  if(!engine) engine = import("./figure3d.js").then(async m => { await m.load(new URL("../models/body.glb", import.meta.url).href); return m; })
    .catch(err => { failed = true; console.warn("3D figures unavailable", err); fallBack(); return null; });
  return engine;
}
const use3d = () => !failed && can3d();
const specOf = el => ({key: el.dataset.key, kind: el.dataset.kind || "barbell", roles: JSON.parse(el.dataset.roles || "{}")});
// A small 3D picture: the 2D drawing sits underneath until the first 3D frame is drawn.
const fig3d = (key, kind, roles, w, h, svg) => `<span class="fig3d-w" style="width:${w}px;height:${h}px">${svg}` +
  `<canvas class="fig3d" width="${w*2}" height="${h*2}" style="width:${w}px;height:${h}px" data-key="${key}" data-kind="${kind}" data-roles='${JSON.stringify(roles).replace(/'/g, "&#39;")}' aria-hidden="true"></canvas></span>`;
// Small pictures in lists and tiles start as soon as they're added to the page.
function hydrate(root){
  const cs = root.querySelectorAll ? root.querySelectorAll("canvas.fig3d[data-key]:not([data-on])") : [];
  if(!cs.length) return;
  load3d().then(m => { if(!m) return; cs.forEach(c => { c.dataset.on = "1"; m.show(c, specOf(c), {tight: true, offset: Math.random() * 3}); }); });
}
// If 3D can't load, every canvas turns back into its 2D still.
function fallBack(){
  document.querySelectorAll("canvas.fig3d[data-key]").forEach(c => c.remove());
  document.querySelectorAll("canvas.fig3d-main").forEach(c => { c.hidden = true; const svg = c.previousElementSibling; if(svg) svg.removeAttribute("data-three"); });
}
if(typeof requestIdleCallback !== "undefined") requestIdleCallback(() => { if(use3d()) load3d(); }, {timeout: 4000});
else setTimeout(() => { if(use3d()) load3d(); }, 1500);
if(typeof MutationObserver !== "undefined" && typeof document !== "undefined")
  new MutationObserver(ms => { if(!use3d()) return; for(const m of ms) for(const n of m.addedNodes) if(n.nodeType === 1) hydrate(n.matches?.("canvas.fig3d") ? n.parentNode : n); })
    .observe(document.documentElement, {childList: true, subtree: true});

// A small picture for lists: the movement in 3D (or its end position in 2D), or the body map when there's no animation.
const stills = new Map();
function stillMarkup(name, size=[40,36], variant){
  const v = visualFor(name, variant);
  if(v.timed && !v.pat) return "";
  const id = `${v.key}|${v.kind}|${JSON.stringify(v.roles)}|${size}`;
  if(!stills.has(id)) stills.set(id, v.pat
    ? `<svg viewBox="${poseBox(v.pat)}" width="${size[0]}" height="${size[1]}" aria-hidden="true" focusable="false">${figureMarkup(v.pat, 1, v.roles, v.kind, {noShadow:true})}</svg>`
    : `<svg viewBox="0 0 58 44" width="${size[0]}" height="${size[1]}" aria-hidden="true" focusable="false">${bodyMapMarkup(v.roles)}</svg>`);
  return v.pat && use3d() ? fig3d(v.key3d || v.key, v.kind3d || v.kind, v.roles, size[0], size[1], stills.get(id)) : stills.get(id);
}

// A still for a movement on its own (browse tiles), with every muscle it shows.
function patternStill(key){
  const id = `pattern|${key}`, p = PATTERNS[key];
  const roles = Object.fromEntries([...(p.bands||[]).map(b=>[b.m,1]), ...(p.regions||[]).map(r=>[r[1],1])]);
  if(!stills.has(id)) stills.set(id, `<svg viewBox="${poseBox(p)}" width="44" height="40" aria-hidden="true" focusable="false">${figureMarkup(p, 1, roles, "barbell", {noShadow:true})}</svg>`);
  return use3d() ? fig3d(key, p.kind3d || "barbell", roles, 60, 50, stills.get(id).replace(/width="44" height="40"/, 'width="60" height="50"')) : stills.get(id);
}

// ---------- animation loop: one requestAnimationFrame for every figure on screen ----------
const live = new Map();   // svg element -> visual
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let raf = 0, last = 0;
const ease = u => u<.5 ? 4*u*u*u : 1-Math.pow(-2*u+2,3)/2;
// One rep every 3.2 s: hold at the start, move, hold at the end, return.
// A looping movement just goes round: one cycle every 1.6 s (cardio), or every `loop` ms (a slower halo).
// Others play out and back, one rep every 3.2 s or every `period` ms (a get-up takes longer).
function phase(ms, p){ if(p.loop) return (ms/(p.loop===true ? 1600 : p.loop))%1; const u=(ms/(p.period||3200))%1; if(u<.08) return 0; if(u<.46) return ease((u-.08)/.38); if(u<.58) return 1; if(u<.94) return 1-ease((u-.58)/.36); return 0; }
function draw(svg, v, t){ svg.innerHTML = figureMarkup(v.pat, t, v.roles, v.kind); }
function tick(now){
  raf = 0;
  if(now-last >= 32){ last = now;   // about 30 frames a second is plenty for these
    for(const [svg, v] of live){ if(!svg.isConnected){ live.delete(svg); continue; } if(svg.getClientRects().length) draw(svg, v, phase(now, v.pat)); }
  }
  if(live.size) raf = requestAnimationFrame(tick);
}
// The 3D canvas that stands in for a big picture's SVG (#ex-thumb, #exs-anim): made once, right after it.
function canvasFor(svg){
  let c = svg.nextElementSibling;
  if(!c || !c.classList.contains("fig3d-main")){
    c = document.createElement("canvas"); c.className = `${svg.getAttribute("class") || ""} fig3d-main`; c.id = `${svg.id}-3d`;
    c.setAttribute("role", "img"); c.hidden = true; svg.after(c);
  }
  return c;
}
// tight: crop to the body (small pictures); otherwise the whole scene with its equipment. The big how-to
// picture can be turned by dragging and shows the direction arrow.
function animate(svg, v, tight=false){
  if(use3d()){
    // The 2D figure shows until the 3D one is ready; then the canvas takes its place.
    const c = canvasFor(svg), big = !tight, token = c._t = (c._t || 0) + 1;
    load3d().then(m => { if(!m || c._t !== token) return;
      m.show(c, {key: v.key3d || v.key, kind: v.kind3d || v.kind, roles: v.roles}, {tight, rotate: big, arrows: big});
      c.setAttribute("aria-label", svg.getAttribute("aria-label") || ""); c.hidden = false; svg.setAttribute("data-three", "1"); live.delete(svg); });
  }
  svg.setAttribute("viewBox", tight ? poseBox(v.pat, v.pat.loop ? [0,.25,.5,.75] : v.pat.pose ? [0,.33,.67,1] : [0,.5,1]) : FIGURE_VIEWBOX);
  if(reduceMotion()){ live.delete(svg); draw(svg, v, 1); svg.dataset.still = "1"; return; }   // a still of the end position
  delete svg.dataset.still; live.set(svg, v); draw(svg, v, 0);
  if(!raf) raf = requestAnimationFrame(tick);
}
function stopAnimating(svg){
  live.delete(svg);
  const c = svg.nextElementSibling;
  if(c && c.classList.contains("fig3d-main")){ c._t = (c._t || 0) + 1; c.hidden = true; svg.removeAttribute("data-three"); engine?.then(m => m?.release(c)); }
}

export { visualFor, stillMarkup, patternStill, animate, stopAnimating, bodyMapMarkup, FIGURE_VIEWBOX };
