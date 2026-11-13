// Lift Log: the Body section at the top of Progress: body weight with a smoothed trend and weekly rate,
// measurements, and progress photos (stored by js/photos.js). ES module; js/app.js calls init() in its fixed order.
import { $, askConfirm, dialog, KG_PER_LB } from "./ui.js";
import { prefs, recordBW, saveSettings, settings } from "./state.js";
import { css, esc, fmt, niceDate, today } from "./log.js";
import { addPhoto, deletePhoto, listPhotos } from "./photos.js";

let view = "weight", rangeDays = 90, measSel = null, chart = null, comparing = false, picked = [], urls = [];
const MEAS = [["waist", "Waist"], ["chest", "Chest"], ["hips", "Hips"], ["arms", "Arms"], ["thighs", "Thighs"], ["fat", "Body fat"]];
const DAY = 864e5, dnum = iso => Date.parse(iso + "T00:00:00Z") / DAY;
const shortDate = d => new Date(d + "T00:00:00").toLocaleDateString(undefined, {month: "short", day: "numeric", year: d.slice(0, 4) === today().slice(0, 4) ? undefined : "numeric"});
const lenUnit = () => prefs.unit === "kg" ? "cm" : "in";
const signed = n => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- weight ----------
// Weigh-ins oldest first, in the display unit: [{date, w}].
function weighIns(){
  const log = settings.bwLog || {};
  return Object.keys(log).filter(d => log[d] && log[d].w > 0).sort().map(d => {
    const r = log[d], u = r.unit || "lb";
    return {date: d, w: u === prefs.unit ? r.w : u === "kg" ? r.w / KG_PER_LB : r.w * KG_PER_LB};
  });
}
// The smoothed trend: each weigh-in pulls the line 10% of the way per day since the last one (so a single heavy
// day barely moves it).
function trendOf(list){
  let t = null, prev = null;
  return list.map(p => { if(t == null) t = p.w; else t += (1 - Math.pow(.9, dnum(p.date) - dnum(prev))) * (p.w - t); prev = p.date; return t; });
}
// Change per week over the last 4 weeks: a straight-line fit through the weigh-ins. Needs a week of data.
function weeklyRate(list){
  if(!list.length) return null;
  const end = dnum(list[list.length - 1].date), pts = list.filter(p => dnum(p.date) >= end - 28).map(p => [dnum(p.date), p.w]);
  if(pts.length < 2 || end - pts[0][0] < 7) return null;
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return 7 * pts.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / pts.reduce((a, [x]) => a + (x - mx) ** 2, 0);
}
function weightHTML(){
  const list = weighIns(), last = list[list.length - 1], tr = trendOf(list), rate = weeklyRate(list), u = prefs.unit;
  const rateText = rate == null ? "" : Math.abs(rate) < .05 ? "Steady" : `${rate < 0 ? "Down" : "Up"} ${fmt(Math.abs(rate))} ${u} a week`;
  return `<div class="bd-now"><span id="body-now">${last ? `<span class="bd-big">${fmt(last.w)}</span><span class="bd-unit">${u}</span>` : "No weigh-ins yet"}</span></div>
    <p class="cal-sub">${last ? `Trend ${fmt(tr[tr.length - 1])} ${u} · ${esc(niceDate(last.date))}` : "Add one here or under Day total on the Log tab."}</p>
    <p class="bd-rate" id="body-rate"${rateText ? "" : " hidden"}>${rateText}</p>
    ${list.length ? `<div class="chart-box bd-chart"><canvas id="body-chart" role="img" aria-label="Body weight chart"></canvas></div>${rangeSeg()}` : ""}
    <button type="button" class="primary bd-add" id="bw-add">Add weigh-in</button>`;
}

// ---------- measurements ----------
// Records oldest first, converted to the display units: [{date, waist, ...}]. Body fat stays a percentage.
function measures(){
  const m = settings.meas || {}, to = lenUnit();
  return Object.keys(m).sort().map(d => {
    const r = m[d], k = (r.unit || "in") === to ? 1 : to === "cm" ? 2.54 : 1 / 2.54, out = {date: d};
    MEAS.forEach(([f]) => { if(r[f] > 0) out[f] = f === "fat" ? r[f] : r[f] * k; });
    return out;
  });
}
const measUnit = f => f === "fat" ? "%" : lenUnit();
function measHTML(){
  const all = measures(), from = isoBack(rangeDays), inRange = all.filter(r => r.date >= from);
  const dims = MEAS.filter(([f]) => all.some(r => r[f] != null));
  if(!dims.some(([f]) => f === measSel)) measSel = dims.length ? dims[0][0] : null;
  const rows = dims.map(([f, t]) => {
    const has = all.filter(r => r[f] != null), latest = has[has.length - 1], first = inRange.find(r => r[f] != null);
    const ch = first && first.date < latest.date ? latest[f] - first[f] : null, good = ch != null && ch < 0 && (f === "waist" || f === "fat");
    return `<button type="button" class="bd-row" data-meas="${f}" aria-pressed="${f === measSel}"><span class="bd-name">${t}</span><span class="bd-val">${fmt(latest[f])} ${measUnit(f)}</span><span class="bd-chg${good ? " good" : ""}">${ch == null ? "—" : signed(Math.round(ch * 10) / 10)}</span></button>`;
  }).join("");
  const lastDate = all.length ? all[all.length - 1].date : null, since = inRange.length ? inRange[0].date : null;
  return (lastDate ? `<p class="cal-sub bd-cap">Last measured ${esc(niceDate(lastDate))}${since && since < lastDate ? ` · change since ${esc(shortDate(since))}` : ""}</p>
    <div class="chart-box bd-chart"><canvas id="body-chart" role="img" aria-label="Measurement chart"></canvas></div>${rangeSeg()}<div class="bd-rows">${rows}</div>` :
    `<p class="cal-sub bd-cap">No measurements yet. Waist, chest, hips, arms, thighs and body fat: fill in the ones you track.</p>`) +
    `<button type="button" class="primary bd-add" id="meas-add">Add measurements</button>`;
}
function isoBack(n){ const d = new Date(today() + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
const rangeSeg = () => `<div class="seg" role="group" aria-label="Range">${[[30, "1 month"], [90, "3 months"], [365, "1 year"]].map(([n, t]) => `<button type="button" data-brange="${n}" aria-pressed="${n === rangeDays}">${t}</button>`).join("")}</div>`;

function openMeas(){
  const all = measures(), now = all.find(r => r.date === today()) || {}, before = all.filter(r => r.date < today());
  const hint = f => { for(let i = before.length - 1; i >= 0; i--) if(before[i][f] != null) return fmt(before[i][f]); return ""; };
  $("#meas-date").textContent = niceDate(today());
  $("#meas-fields").innerHTML = MEAS.map(([f, t]) => `<label class="bd-field"><span class="lbl">${t} (${measUnit(f)})</span><input id="m-${f}" type="text" inputmode="decimal" autocomplete="off" placeholder="${hint(f)}" value="${now[f] != null ? fmt(now[f]) : ""}"></label>`).join("");
  $("#meas-sheet").hidden = false; $("#m-waist").focus();
}
function closeMeas(){ $("#meas-sheet").hidden = true; ($("#meas-add") || $("#body")).focus({preventScroll: true}); }
async function saveMeas(){
  const r = {};
  MEAS.forEach(([f]) => { const n = parseFloat($(`#m-${f}`).value.replace(",", ".")); if(n > 0 && (f !== "fat" || n < 75)) r[f] = n; });
  if(Object.keys(r).length){ r.unit = lenUnit(); settings.meas[today()] = r; }
  else delete settings.meas[today()];
  $("#meas-sheet").hidden = true; await saveSettings(); closeMeas();
}

// ---------- the chart (weight or the chosen measurement) ----------
function drawChart(){
  if(chart){ chart.destroy(); chart = null; }
  const cv = $("#body-chart"); if(!cv || !window.Chart) return;
  const from = dnum(isoBack(rangeDays)), tick = v => shortDate(new Date(v * DAY).toISOString().slice(0, 10));
  let sets;
  if(view === "weight"){
    const all = weighIns(), tr = trendOf(all), idx = all.map((p, i) => i).filter(i => dnum(all[i].date) >= from);
    sets = [{type: "scatter", label: `Weigh-in (${prefs.unit})`, data: idx.map(i => ({x: dnum(all[i].date), y: Math.round(all[i].w * 10) / 10})), backgroundColor: css("--muted"), pointRadius: 3},
      {type: "line", label: `Trend (${prefs.unit})`, data: idx.map(i => ({x: dnum(all[i].date), y: Math.round(tr[i] * 10) / 10})), borderColor: css("--blue"), borderWidth: 3, pointRadius: 0, tension: .3}];
  } else {
    const f = measSel, pts = measures().filter(r => r[f] != null && dnum(r.date) >= from);
    sets = [{type: "line", label: `${MEAS.find(m => m[0] === f)[1]} (${measUnit(f)})`, data: pts.map(r => ({x: dnum(r.date), y: Math.round(r[f] * 10) / 10})), borderColor: css("--blue"), backgroundColor: css("--blue"), borderWidth: 3, pointRadius: 4, tension: .25}];
  }
  const xs = sets.flatMap(d => d.data.map(p => p.x)), lo = Math.min(...xs), hi = Math.max(...xs, lo + 7);
  chart = new Chart(cv, {type: "scatter", data: {datasets: sets},
    options: {responsive: true, maintainAspectRatio: false, animation: reduced() ? false : {duration: 400},
      plugins: {legend: {display: false}, tooltip: {callbacks: {title: c => tick(c[0].parsed.x), label: c => `${c.dataset.label}: ${fmt(c.parsed.y)}`}}},
      scales: {x: {type: "linear", min: lo, max: hi, grid: {display: false}, ticks: {maxTicksLimit: 4, callback: tick}}, y: {grid: {color: css("--line")}}}}});
}

// ---------- photos ----------
async function renderPhotos(){
  const box = $("#body .bd-photos"); if(!box) return;
  let list = [];
  try{ list = await listPhotos(); }catch(e){ box.innerHTML = `<p class="cal-sub">Photos aren't available in this browser.</p>`; return; }
  urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
  if(view !== "photos" || !$("#body .bd-photos")) return;
  $("#photo-compare").hidden = list.length < 2;
  $("#photo-compare").setAttribute("aria-pressed", String(comparing));
  $("#photo-tip").hidden = !comparing;
  box.innerHTML = list.length ? list.map(p => { const u = URL.createObjectURL(p.blob); urls.push(u);
    return `<button type="button" class="bd-ph" data-photo="${p.id}" data-date="${p.date}" aria-pressed="${picked.includes(p.id)}" aria-label="Photo, ${esc(niceDate(p.date))}"><img src="${u}" alt=""><b>${esc(shortDate(p.date))}</b></button>`; }).join("")
    : `<p class="cal-sub bd-empty">No photos yet. They stay on this phone; back them up from Settings.</p>`;
}
const photosHTML = () => `<div class="bd-photos"></div>
  <p class="cal-sub" id="photo-tip" hidden>Tap two photos to compare them.</p>
  <div class="edit-actions"><button type="button" class="secondary" id="photo-compare" aria-pressed="false" hidden>Compare</button><button type="button" class="primary" id="photo-add">Add photo</button></div>`;
// Weight and waist near a photo's day (within a week), when you have them.
function near(list, date, f){
  let best = null;
  list.forEach(r => { const g = Math.abs(dnum(r.date) - dnum(date)); if(r[f] != null && g <= 7 && (!best || g < best.g)) best = {g, v: r[f]}; });
  return best ? best.v : null;
}
async function openCompare(a, b){
  const list = await listPhotos(), [p, q] = [a, b].map(id => list.find(x => x.id === id)).sort((x, y) => x.date < y.date ? -1 : 1);
  const ws = weighIns(), ms = measures(), info = x => { const w = near(ws, x.date, "w"), m = near(ms, x.date, "waist");
    return [w != null && `${fmt(w)} ${prefs.unit}`, m != null && `waist ${fmt(m)} ${lenUnit()}`].filter(Boolean).join(" · "); };
  const days = Math.round(dnum(q.date) - dnum(p.date)), wa = near(ws, p.date, "w"), wb = near(ws, q.date, "w");
  const apart = days < 14 ? `${days} day${days === 1 ? "" : "s"} apart` : `${Math.floor(days / 7)} weeks apart`;
  const pic = x => { const u = URL.createObjectURL(x.blob); urls.push(u); return `<figure><img src="${u}" alt="Photo, ${esc(niceDate(x.date))}"><figcaption><b>${esc(shortDate(x.date))}</b>${info(x) ? `<br>${esc(info(x))}` : ""}</figcaption></figure>`; };
  $("#cmp-body").innerHTML = `<div class="bd-cmp">${pic(p)}${pic(q)}</div><p class="bd-rate bd-apart">${apart}${wa != null && wb != null ? ` · ${signed(Math.round((wb - wa) * 10) / 10)} ${prefs.unit}` : ""}</p>`;
  $("#cmp-sheet").hidden = false; $("#cmp-close").focus();
}
let viewing = null;
async function openPhoto(id){
  const p = (await listPhotos()).find(x => x.id === id); if(!p) return;
  viewing = id; const u = URL.createObjectURL(p.blob); urls.push(u);
  $("#photo-title").textContent = niceDate(p.date);
  $("#photo-view").innerHTML = `<img src="${u}" alt="Photo, ${esc(niceDate(p.date))}">`;
  $("#photo-sheet").hidden = false; $("#photo-close").focus();
}

// Settings shows how many photos there are (loaded when needed: js/backup.js also uses this file).
const photosChanged = () => import("./backup.js").then(m => m.renderBackup());

// ---------- the section ----------
function renderBody(){
  const el = $("#body"); if(!el) return;
  const views = [["weight", "Weight"], ["meas", "Measurements"], ["photos", "Photos"]];
  el.innerHTML = `<h2>Body</h2><div class="seg" role="group" aria-label="Body">${views.map(([k, t]) => `<button type="button" data-bview="${k}" aria-pressed="${k === view}">${t}</button>`).join("")}</div>
    <div class="bd-view">${view === "weight" ? weightHTML() : view === "meas" ? measHTML() : photosHTML()}</div>`;
  if(view === "photos") renderPhotos(); else drawChart();
}

export function init(){
  const el = $("#body");
  el.addEventListener("click", async e => {
    const v = e.target.closest("[data-bview]"), r = e.target.closest("[data-brange]"), m = e.target.closest("[data-meas]"), ph = e.target.closest("[data-photo]");
    if(v){ view = v.dataset.bview; comparing = false; picked = []; renderBody(); }
    else if(r){ rangeDays = +r.dataset.brange; renderBody(); }
    else if(m){ measSel = m.dataset.meas; renderBody(); }
    else if(e.target.closest("#bw-add")){
      const t = await dialog({message: `Body weight today (${prefs.unit})`, input: prefs.unit === "kg" ? "e.g. 82.5" : "e.g. 182.4", ok: "Save"});
      const n = parseFloat((t || "").replace(",", "."));
      if(n > 0){ recordBW(today(), n); await saveSettings(); }
    }
    else if(e.target.closest("#meas-add")) openMeas();
    else if(e.target.closest("#photo-add")) $("#photo-file").click();
    else if(e.target.closest("#photo-compare")){ comparing = !comparing; picked = []; renderPhotos(); }
    else if(ph){
      if(!comparing) return openPhoto(ph.dataset.photo);
      picked = picked.includes(ph.dataset.photo) ? picked.filter(x => x !== ph.dataset.photo) : [...picked, ph.dataset.photo];
      if(picked.length === 2){ const [a, b] = picked; comparing = false; picked = []; await renderPhotos(); openCompare(a, b); }
      else ph.setAttribute("aria-pressed", String(picked.includes(ph.dataset.photo)));
    }
  });
  $("#photo-file").addEventListener("change", async ev => {
    const f = ev.target.files[0]; ev.target.value = ""; if(!f) return;
    try{ await addPhoto(f); }catch(e){ dialog({message: "Couldn't save that photo on this phone.", cancel: null}); }
    renderPhotos(); photosChanged();
  });
  $("#meas-save").addEventListener("click", saveMeas);
  $("#meas-cancel").addEventListener("click", closeMeas);
  const closeOn = (id, close) => { $(id).addEventListener("click", e => { if(e.target === $(id)) close(); }); $(id).addEventListener("keydown", e => { if(e.key === "Escape"){ e.preventDefault(); close(); } }); };
  closeOn("#meas-sheet", closeMeas);
  const closeCmp = () => { $("#cmp-sheet").hidden = true; ($("#photo-compare") || el).focus({preventScroll: true}); };
  $("#cmp-close").addEventListener("click", closeCmp); closeOn("#cmp-sheet", closeCmp);
  const closePhoto = () => { $("#photo-sheet").hidden = true; ($("#photo-add") || el).focus({preventScroll: true}); };
  $("#photo-close").addEventListener("click", closePhoto); closeOn("#photo-sheet", closePhoto);
  $("#photo-del").addEventListener("click", async () => {
    $("#photo-sheet").hidden = true;
    if(await askConfirm("Delete this photo? This can't be undone.", "Delete", true)){ await deletePhoto(viewing); renderPhotos(); photosChanged(); }
    else $("#photo-sheet").hidden = false;
  });
}

export { renderBody, weighIns, trendOf, weeklyRate, measures };
