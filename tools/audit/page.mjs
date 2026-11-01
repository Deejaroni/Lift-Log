// In-page checks for the UI audit (tools/ui-audit.mjs). Each exported function runs inside the app through
// page.evaluate, so it must be self-contained: no imports and nothing from the rest of this file.

// Everything measured on one screen: usability, layout, pressed looks, the sizes in use and the visible wording.
export function inspect({ MIN_TAP, GUTTER, ACTIONS }) {
  const W = innerWidth, H = innerHeight;
  const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const name = el => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""}`;
  const text = el => (el.getAttribute("aria-label") || el.textContent || el.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 32);
  const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(" ").replace(/\s+/g, " ").trim();
  const up = (el, test) => { for (let e = el; e && e !== document.body; e = e.parentElement) if (test(e, getComputedStyle(e))) return e; return null; };
  const pinned = el => up(el, (e, s) => s.position === "fixed" || s.position === "sticky");
  const scroller = el => up(el.parentElement, (e, s) => /auto|scroll/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1);
  const hidden = el => up(el, (e) => e.getAttribute("aria-hidden") === "true" || e.tagName === "svg");
  // The box around an element's own text (tighter than the element when it's a block).
  const range = document.createRange();
  const textBox = el => { let b = null; for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { range.selectNodeContents(n);
    for (const q of range.getClientRects()) b = b ? { l: Math.min(b.l, q.left), r: Math.max(b.r, q.right), t: Math.min(b.t, q.top), b: Math.max(b.b, q.bottom) } : { l: q.left, r: q.right, t: q.top, b: q.bottom }; } return b; };
  const onScreen = r => r.bottom > 0 && r.top < H && r.right > 0 && r.left < W;
  // On top at its own center: not hidden behind a sheet, the tab bar or anything else.
  const onTop = (el, r) => { const x = (r.l ?? r.left) + ((r.r ?? r.right) - (r.l ?? r.left)) / 2, y = (r.t ?? r.top) + ((r.b ?? r.bottom) - (r.t ?? r.top)) / 2;
    if (x < 0 || y < 0 || x >= W || y >= H) return false; const hit = document.elementFromPoint(x, y); return !!hit && (hit === el || el.contains(hit) || hit.contains(el)); };
  // The part of an element its scrolling or clipping ancestors leave showing (null when none).
  const clipTo = (el, b) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.overflowX === "visible" && s.overflowY === "visible") continue;
    const r = e.getBoundingClientRect(); b = { l: Math.max(b.l, r.left), r: Math.min(b.r, r.right), t: Math.max(b.t, r.top), b: Math.min(b.b, r.bottom) }; if (b.r - b.l < 1 || b.b - b.t < 1) return null; } return b; };
  const shown = el => { const r = el.getBoundingClientRect(); return clipTo(el, { l: r.left, r: r.right, t: r.top, b: r.bottom }); };
  const all = [...document.querySelectorAll("body *")].filter(el => vis(el) && shown(el));
  const controls = all.filter(el => el.matches("button, select, a[href], [role=button], input:not([type=hidden]), textarea"));

  const small = controls.filter(el => !el.matches("input[type=checkbox], input[type=radio]") && el.getBoundingClientRect().height < MIN_TAP)
    .map(el => `${name(el)} "${text(el)}" is ${Math.round(el.getBoundingClientRect().height)} px tall`);
  const unnamed = controls.filter(el => el.matches("input, select, textarea, button"))
    .filter(el => !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.title && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.closest("label") && !(el.tagName === "BUTTON" && el.textContent.trim()))
    .map(el => `${name(el)} has no name for screen readers`);

  // Contrast: each element's own text against the first solid background behind it.
  const rgb = c => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lum = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
  const solid = c => c && (c[3] === undefined || c[3] > .9);
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (solid(c)) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
  const low = new Map(), texts = all.filter(el => own(el) && !hidden(el));
  for (const el of texts) {
    const s = getComputedStyle(el), fg = rgb(s.color), bg = bgOf(el);
    if (!fg || (fg[3] !== undefined && fg[3] < .9) || +s.opacity < 1) continue;
    const [a, b] = [lum(fg), lum(bg)], ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const size = parseFloat(s.fontSize), large = size >= 24 || (size >= 18.66 && +s.fontWeight >= 700), need = large ? 3 : 4.5;
    const k = `${s.color} on rgb(${bg.slice(0, 3).join(", ")})`;
    if (ratio < need && !low.has(k)) low.set(k, `"${own(el).slice(0, 32)}" ${ratio.toFixed(2)}:1, needs ${need}:1 (${name(el)}, ${k})`);
  }
  const wide = document.documentElement.scrollWidth > W + 1 ? [`the page scrolls sideways (${document.documentElement.scrollWidth} px wide)`] : [];

  // Text cut off by its box (ellipsis or hidden overflow), and text spilling out of a box that doesn't clip.
  const cut = [], spill = [];
  for (const el of all) {
    const s = getComputedStyle(el);
    if (!el.textContent.trim() || hidden(el)) continue;
    const across = /hidden|clip/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1, down = /hidden|clip/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2;
    if ((across || down) && !el.matches("input, select, textarea")) cut.push(`"${text(el)}" is cut off${s.textOverflow === "ellipsis" ? " with …" : ""} (${name(el)})`);
  }
  for (const el of texts) {
    const b = textBox(el); if (!b) continue;
    const box = up(el, (e, s) => !s.display.startsWith("inline") || e.tagName === "BUTTON") || el, r = box.getBoundingClientRect();
    if (/hidden|clip/.test(getComputedStyle(box).overflowX)) continue;
    if (b.r > W + 1 && !scroller(el)) spill.push(`"${own(el).slice(0, 32)}" runs off the screen (${name(el)})`);
    else if (b.r > r.right + 1 || b.l < r.left - 1 || b.b > r.bottom + 4) spill.push(`"${own(el).slice(0, 32)}" spills out of ${name(box)}`);
  }

  // Overlaps: two things on screen, both on top at their centers, whose boxes cross.
  const items = [...controls, ...texts.filter(el => !el.closest("button, a, [role=button]"))]
    .filter(el => !hidden(el) && !pinned(el)).map(el => ({ el, r: el.matches("button, select, a, [role=button], input, textarea") ? shown(el) : (b => b && clipTo(el, b))(textBox(el)) }))
    .filter(i => i.r && onScreen({ top: i.r.t, bottom: i.r.b, left: i.r.l, right: i.r.r }) && onTop(i.el, i.r));
  const overlap = new Set();
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const w = Math.min(a.r.r, b.r.r) - Math.max(a.r.l, b.r.l), h = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
    if (w > 4 && h > 4) overlap.add(`${name(a.el)} "${text(a.el)}" overlaps ${name(b.el)} "${text(b.el)}"`);
  }

  // Alignment: boxes and text blocks whose left or right edge is 1–3 px off an edge three or more others share.
  const blocks = all.filter(el => !pinned(el) && !hidden(el) && !el.closest("button") && !scroller(el) && onScreen(el.getBoundingClientRect()))
    .filter(el => { const s = getComputedStyle(el); if (s.display.startsWith("inline") || s.position === "absolute") return false;
      const p = el.parentElement && getComputedStyle(el.parentElement); return own(el) || parseFloat(s.borderLeftWidth) > 0 || (solid(rgb(s.backgroundColor)) && p && s.backgroundColor !== p.backgroundColor); });
  const align = new Set();
  for (const side of ["left", "right"]) {
    const count = new Map(); blocks.forEach(el => { const x = Math.round(el.getBoundingClientRect()[side]); count.set(x, (count.get(x) || 0) + 1); });
    for (const el of blocks) { const x = Math.round(el.getBoundingClientRect()[side]); if (count.get(x) >= 3) continue;
      for (const [x2, n] of count) { const d = Math.abs(x - x2); if (n >= 3 && d >= 1 && d <= 3) { align.add(`${name(el)} ${side} edge is ${d} px off ${n} others at ${x2} px`); break; } } }
  }
  // Text closer to the screen edge than the page's side margin.
  const gutter = new Set();
  for (const el of texts) { if (pinned(el) || scroller(el)) continue; const b = textBox(el); if (!b || !onScreen({ top: b.t, bottom: b.b, left: b.l, right: b.r }) || !onTop(el, b)) continue;
    const gap = Math.round(Math.min(b.l, W - b.r)); if (gap < GUTTER - 1) gutter.add(`"${own(el).slice(0, 32)}" is ${gap} px from the screen edge (${name(el)})`); }

  // Pressed look: controls no :active rule applies to.
  const act = [];
  const walk = rules => { for (const r of rules) { if (r.selectorText) { for (const s of r.selectorText.split(",")) if (s.includes(":active")) act.push(s.replace(/:active/g, "").trim() || "*"); } else if (r.cssRules) walk(r.cssRules); } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch { /* another origin */ } }
  const pressed = el => act.some(s => { try { return el.matches(s) || el.matches(`${s} *`); } catch { return false; } });
  const flat = new Map();
  for (const el of controls.filter(el => el.matches("button, a[href], [role=button]") && !el.disabled && !pressed(el))) { const k = name(el); if (!flat.has(k)) flat.set(k, { t: text(el), n: 0 }); flat.get(k).n++; }
  const unpressed = [...flat].map(([k, v]) => `${k} "${v.t}"${v.n > 1 ? ` (and ${v.n - 1} more like it)` : ""} has no pressed look`);

  // The sizes in use, by value, with the element kinds that use each one.
  const styles = { "Font size": {}, "Font weight": {}, "Corner radius": {}, "Spacing": {}, "Shadow": {}, "Motion": {} };
  const note = (prop, v, el) => { (styles[prop][v] ||= new Set()).add(name(el).replace(/#[\w-]+/, "")); };
  const px = v => Math.round(parseFloat(v) * 10) / 10;
  for (const el of all) {
    if (hidden(el)) continue; const s = getComputedStyle(el), r = el.getBoundingClientRect();
    if (own(el)) { note("Font size", `${px(s.fontSize)}px`, el); note("Font weight", s.fontWeight, el); }
    const rad = parseFloat(s.borderTopLeftRadius); if (rad > 0 && rad < Math.min(r.width, r.height) / 2) note("Corner radius", `${px(rad)}px`, el);
    for (const p of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "marginTop", "marginBottom", "rowGap", "columnGap"]) { const v = parseFloat(s[p]); if (v > 0) note("Spacing", `${px(v)}px`, el); }
    if (s.boxShadow !== "none") note("Shadow", s.boxShadow.replace(/rgba?\([^)]*\)/g, "color"), el);
    if (s.transitionDuration.split(",").some(d => parseFloat(d) > 0)) note("Motion", `transition ${s.transitionDuration} ${s.transitionTimingFunction}`, el);
    if (s.animationName !== "none") note("Motion", `animation ${s.animationDuration} ${s.animationTimingFunction}`, el);
  }
  for (const p in styles) for (const v in styles[p]) styles[p][v] = [...styles[p][v]];

  // Wording: the text of controls, labels and headings, whether it wraps, and all the visible text.
  const labels = all.filter(el => el.matches("button, label, legend, summary, h1, h2, h3, th, [role=tab], .lbl") && !hidden(el) && el.textContent.trim())
    .filter(el => !el.matches("h1, h2, h3, .ex-name-btn") && el.textContent.trim().length <= 24)
    .filter(el => ![...el.querySelectorAll("*")].some(c => !getComputedStyle(c).display.startsWith("inline")));
  const wraps = labels.filter(el => { range.selectNodeContents(el); return new Set([...range.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top / 4))).size > 1; })
    .map(el => `"${text(el)}" wraps to two lines (${name(el)}, ${Math.round(el.getBoundingClientRect().width)} px wide)`);
  const words = [...new Set(all.filter(el => el.matches("button, label, legend, summary, h1, h2, h3, th, [role=tab], .lbl") && !hidden(el)).map(el => el.textContent.replace(/\s+/g, " ").trim()))];

  // Where the most-used controls sit on screen, for the thumb-reach map.
  const actions = ACTIONS.flatMap(([label, sel]) => [...document.querySelectorAll(sel)].filter(vis).map(el => el.getBoundingClientRect())
    .filter(onScreen).map(r => ({ label, x: r.left + r.width / 2, y: r.top + r.height / 2, box: [r.left, r.top, r.width, r.height] })));

  return { small, unnamed, contrast: [...low.values()], wide, cut: [...new Set(cut)], spill: [...new Set(spill)], overlap: [...overlap], align: [...align],
    gutter: [...gutter], unpressed, wraps: [...new Set(wraps)], styles, words, allText: document.body.innerText, actions };
}

// Remembers where everything on screen is, then reports what moved more than 4 px since.
export function snapRects() {
  window.__auditSnap = { y: scrollY, rects: new Map() };
  for (const el of document.querySelectorAll("body *")) { const r = el.getBoundingClientRect(); if (r.width && r.height && r.bottom > 0 && r.top < innerHeight) window.__auditSnap.rects.set(el, [r.left, r.top]); }
}
export function movedRects() {
  const name = el => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/)[0] : ""}`;
  const { y, rects } = window.__auditSnap, out = [];
  if (Math.abs(scrollY - y) > 4) return [`the page scrolled ${Math.round(scrollY - y)} px by itself`];
  const moved = new Map();
  for (const [el, [l, t]] of rects) { if (!el.isConnected) continue; const r = el.getBoundingClientRect(), d = [Math.round(r.left - l), Math.round(r.top - t)]; if (Math.abs(d[0]) > 4 || Math.abs(d[1]) > 4) moved.set(el, d); }
  // Only the outermost thing that moved, not everything inside it.
  for (const [el, d] of moved) { const p = el.parentElement, pd = p && moved.get(p); if (pd && pd[0] === d[0] && pd[1] === d[1]) continue; out.push(`${name(el)} moved ${d[1] ? `${Math.abs(d[1])} px ${d[1] > 0 ? "down" : "up"}` : `${Math.abs(d[0])} px sideways`}`); }
  return out.slice(0, 8);
}

// Paints the thumb-reach map over the screen: zones, and an outline on each frequent control.
export function drawReach({ zones, actions }) {
  const o = document.createElement("div"); o.id = "audit-reach";
  o.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none";
  const C = { easy: "rgba(46,160,90,.22)", stretch: "rgba(230,170,20,.22)", hard: "rgba(220,50,50,.25)" }, L = { easy: "#1e8a4c", stretch: "#b07a00", hard: "#c62828" };
  for (const z of zones) o.insertAdjacentHTML("beforeend", `<i style="position:absolute;left:${z.x}px;top:${z.y}px;width:${z.w}px;height:${z.h}px;background:${C[z.zone]}"></i>`);
  for (const a of actions) o.insertAdjacentHTML("beforeend", `<b style="position:absolute;left:${a.box[0]}px;top:${a.box[1]}px;width:${a.box[2]}px;height:${a.box[3]}px;outline:3px solid ${L[a.zone]};outline-offset:-1px;border-radius:6px"></b>`);
  document.body.append(o);
}

// Compares two screenshots (data URLs). Returns how much changed, where, and a picture with the changes in red.
export async function diffImages([a, b]) {
  const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const [A, B] = await Promise.all([load(a), load(b)]);
  if (A.width !== B.width || A.height !== B.height) return { changed: 1, size: true };
  const w = A.width, h = A.height, c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(A, 0, 0); const pa = g.getImageData(0, 0, w, h).data;
  g.drawImage(B, 0, 0); const img = g.getImageData(0, 0, w, h), pb = img.data;
  let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < pa.length; i += 4) {
    const d = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2]));
    if (d > 32) { n++; const p = i / 4, x = p % w, y = (p - x) / w; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); pb[i] = 230; pb[i + 1] = 30; pb[i + 2] = 40; }
    else { pb[i] = 255 - (255 - pb[i]) * .35; pb[i + 1] = 255 - (255 - pb[i + 1]) * .35; pb[i + 2] = 255 - (255 - pb[i + 2]) * .35; }
  }
  if (!n) return { changed: 0 };
  g.drawImage(A, 0, 0); const before = c.toDataURL("image/jpeg", .7);
  g.putImageData(img, 0, 0);
  return { changed: n / (w * h), box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], before, image: c.toDataURL("image/jpeg", .7) };
}
