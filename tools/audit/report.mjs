// The UI audit's findings: the checks that look across screens (wording, sizes in use) and the report page.
import fs from "node:fs";
import path from "node:path";

// Per-screen checks, in report order.
export const KINDS = [["small", "Tap targets under 40 px"], ["contrast", "Low contrast text"], ["unnamed", "No screen-reader name"], ["wide", "Sideways scrolling"],
  ["errors", "Console errors"], ["cut", "Text cut off"], ["spill", "Text spills out of its box"], ["overlap", "Overlapping items"], ["gutter", "Too close to the screen edge"],
  ["align", "Slightly misaligned"], ["unpressed", "No pressed look"], ["moves", "Moves after opening"], ["motion", "Moves with reduce motion on"], ["wraps", "Labels that wrap"]];

// ---------- wording ----------
// Capitalized words that are names, abbreviations or the app's muscle groups and plan days, not title case.
const PROPER = `Archivo Smith EZ PR PRs RPE RIR CSV DOTS OHP RDL RDLs SLDL RM 1RM e1RM MET ACSM ID OK I Push Pull Legs Upper Lower Full
  Monday Tuesday Wednesday Thursday Friday Saturday Sunday Mon Tue Wed Thu Fri Sat Sun January February March April May June July August
  September October November December Jan Feb Mar Apr Jun Jul Aug Sep Sept Oct Nov Dec Chest Back Shoulders Biceps Triceps Quadriceps
  Hamstrings Glutes Calves Abdominals Forearms Cardio Mobility Other Lift Log Plan History Progress Settings`.split(/\s+/);
const TWO_WAYS = [["lb", "lbs"], ["kg", "kgs"], ["delete", "remove"], ["est. 1RM", "e1RM", "1-rep max", "one-rep max"], ["workout", "session"], ["reps left", "RIR"], ["ok", "okay"]];

export function wording(main, catalog) {
  // The exercise names' own capitals (Bulgarian, Romanian, Turkish...) are fine too.
  const allow = new Set([...PROPER, ...[...catalog.matchAll(/[a-z,]\s([A-Z][a-z]+)/g)].map(m => m[1])]);
  const where = new Map(), add = (k, screen) => { if (!where.has(k)) where.set(k, new Set()); where.get(k).add(screen); };
  const texts = {};
  for (const [screen, s] of Object.entries(main.screens)) { const m = s.light || s.dark; texts[screen] = m.allText;
    for (const t of m.words) for (const seg of t.split(/[.!?:·•|—–()/\n]|\s-\s|\d/)) seg.trim().split(/\s+/).filter(w => /[a-z]/i.test(w)).slice(1).forEach(w => {
      w = w.replace(/^[^\w]+|[^\w]+$/g, ""); if (/^[A-Z][a-z]/.test(w) && !allow.has(w)) add(`"${t.slice(0, 40)}" isn't sentence case ("${w}")`, screen); }); }
  const caseIssues = [...where].map(([issue, s]) => ({ kind: "Not sentence case", issue, modes: ["light"], screens: [...s] }));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const twoWays = TWO_WAYS.map(vs => vs.map(v => { const re = new RegExp(`(^|[^\\w])${esc(v)}(?![\\w-])`, "i");
    return { v, screens: Object.keys(texts).filter(k => re.test(texts[k])) }; }).filter(x => x.screens.length)).filter(xs => xs.length > 1)
    .map(xs => ({ kind: "Same thing said two ways", issue: xs.map(x => `"${x.v}" (${x.screens.slice(0, 3).join(", ")}${x.screens.length > 3 ? "…" : ""})`).join(" and "), modes: ["light"], screens: [...new Set(xs.flatMap(x => x.screens))] }));
  return [...caseIssues, ...twoWays];
}

// ---------- the sizes in use ----------
// Each value with the kinds of element that use it. A value used by one kind only, or within a pixel of a more common
// value, is a likely leftover: a candidate to snap to a standard size.
export function consistency(main) {
  const merged = {};
  for (const s of Object.values(main.screens)) for (const m of [s.light, s.dark].filter(Boolean)) for (const [prop, vals] of Object.entries(m.styles))
    for (const [v, kinds] of Object.entries(vals)) kinds.forEach(k => ((merged[prop] ||= {})[v] ||= new Set()).add(k));
  const out = {};
  for (const [prop, vals] of Object.entries(merged)) {
    const tol = prop === "Font size" ? .75 : 1, num = v => parseFloat(v);
    const rows = Object.entries(vals).map(([value, k]) => ({ value, kinds: [...k].sort() })).sort((a, b) => num(a.value) - num(b.value) || a.value.localeCompare(b.value));
    for (const r of rows) {
      if (rows.length >= 4 && r.kinds.length === 1) r.rare = true;
      if (!isNaN(num(r.value))) { const near = rows.find(o => o !== r && o.kinds.length > r.kinds.length && Math.abs(num(o.value) - num(r.value)) <= tol); if (near) r.near = near.value; }
    }
    out[prop] = rows;
  }
  return out;
}

// ---------- the report ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const verdict = s => s.ms == null ? "not measured" : s.ms <= s.budget ? "quick" : s.ms <= s.budget * 2 ? "noticeable" : "slow";

export function writeReport({ OUT, findings, images, W, H, SLOW, FREQUENT }) {
  // Each issue once, with the screens and modes it showed up on (the Log tab sits behind Settings and the sheet).
  // Edge cases list only what the sample data didn't already show.
  const collect = (sc, skip = new Set()) => { const map = new Map();
    for (const [title, s] of Object.entries(sc.screens)) for (const [mode, m] of Object.entries(s)) for (const [k, label] of KINDS)
      for (const x of m[k] || []) { const key = `${label}|${x}`; if (skip.has(key)) continue; if (!map.has(key)) map.set(key, { kind: label, issue: x, modes: new Set(), screens: new Set() });
        map.get(key).modes.add(mode); map.get(key).screens.add(title); }
    return [...map.values()].map(i => ({ ...i, modes: [...i.modes], screens: [...i.screens] })); };
  const [main, ...extra] = findings.scenarios, issues = collect(main), seen = new Set(issues.map(i => `${i.kind}|${i.issue}`));
  const edge = extra.map(sc => ({ title: sc.title, issues: collect(sc, seen) }));
  issues.push(...findings.wording);
  for (const s of findings.speed) if (/noticeable|slow/.test(verdict(s))) issues.push({ kind: "Slow on a slower phone", issue: `${s.action} takes ${s.ms} ms on a ${SLOW}× slower phone (aim for ${s.budget} ms)`, modes: ["light"], screens: [] });
  for (const r of findings.reach) for (const label of new Set(r.actions.filter(a => FREQUENT.has(a.label) && a.zone === "hard").map(a => a.label)))
    issues.push({ kind: "Hard to reach one-handed", issue: `${label} is in the hard-to-reach area`, modes: ["light"], screens: [r.screen] });
  findings.issues = issues; findings.edgeCases = edge;
  const notes = Object.values(findings.consistency).flat().filter(r => r.rare || r.near).length;
  const total = issues.length + findings.source.length, edgeTotal = edge.reduce((n, e) => n + e.issues.length, 0);

  const group = (xs, open) => [...new Set(xs.map(i => i.kind))].map(kind => { const ys = xs.filter(i => i.kind === kind);
    return `<details class="card" ${open && ys.length <= 8 ? "open" : ""}><summary><h2>${esc(kind)} (${ys.length})</h2></summary><ul>${ys.map(i => `<li>${esc(i.issue)} <small>${i.modes.join(" and ")}${i.screens.length ? " · " + esc(i.screens.join(", ")) : ""}</small></li>`).join("")}</ul></details>`; }).join("");
  const list = group(issues, true);
  const edges = edge.map(e => `<h3 class="sub">${esc(e.title)} <small>${e.issues.length} more</small></h3>${group(e.issues, false)}`).join("");
  const ch = findings.changes;
  const changes = !ch.compared && !ch.added.length ? `<p>First run: nothing to compare yet. The next run shows what changed since this one.</p>`
    : `<p>${ch.changed.length} of ${ch.compared} screenshots changed since the last run.${ch.added.length ? ` New: ${esc(ch.added.join(", "))}.` : ""}${ch.removed.length ? ` Gone: ${esc(ch.removed.join(", "))}.` : ""}</p>`
      + ch.changed.map(c => `<div class="card"><h3>${esc(c.file)} <small>${c.size ? "the screenshot's size changed" : `${(c.changed * 100).toFixed(1)}% of the screen, around ${c.box.join(", ")}`}</small></h3><div class="pair">
        ${c.before ? `<figure><img src="${c.before}" alt=""><figcaption>Last run</figcaption></figure>` : ""}<figure><img src="${images[c.file]}" alt=""><figcaption>Now</figcaption></figure>${c.image ? `<figure><img src="${c.image}" alt=""><figcaption>Changes in red</figcaption></figure>` : ""}</div></div>`).join("");
  const Z = { easy: "Easy", stretch: "Stretch", hard: "Hard" };
  const reach = findings.reach.map(r => `<div class="card"><h3>${esc(r.screen)}</h3><div class="pair"><figure><img src="${images[r.image]}" alt=""></figure>
    <table><tr><th>Control</th><th>Reach</th></tr>${[...new Map(r.actions.map(a => [a.label, r.actions.filter(b => b.label === a.label).map(b => b.zone)]))].map(([l, zs]) =>
      `<tr><td>${esc(l)}${FREQUENT.has(l) ? " ★" : ""}</td><td>${[...new Set(zs)].map(z => `<span class="z ${z}">${Z[z]}</span>`).join(" ")}</td></tr>`).join("")}</table></div></div>`).join("");
  const speed = `<table><tr><th>Action</th><th>Time</th><th>Aim</th><th></th></tr>${findings.speed.map(s => `<tr><td>${esc(s.action)}</td><td>${s.ms ?? "–"} ms</td><td>${s.budget} ms</td><td><span class="v ${verdict(s).replace(" ", "-")}">${verdict(s)}</span></td></tr>`).join("")}</table>`;
  const sizes = Object.entries(findings.consistency).map(([prop, rows]) => `<div class="card"><h3>${esc(prop)} <small>${rows.length} values</small></h3><div class="vals">${rows.map(r =>
    `<span class="val${r.rare || r.near ? " odd" : ""}" title="${esc(r.kinds.join(", "))}"><b>${esc(r.value)}</b> ${r.kinds.length}${r.near ? ` · near ${esc(r.near)}` : r.rare ? " · used once" : ""}</span>`).join("")}</div></div>`).join("");
  const screens = findings.scenarios.map(sc => `<h2 class="sec">${esc(sc.title)}</h2>` + Object.entries(sc.screens).map(([title, s]) =>
    `<div class="card"><h3>${esc(title)}</h3><div class="pair">${Object.entries(s).map(([mode, m]) => `<figure><img src="${images[m.file]}" alt=""><figcaption>${mode[0].toUpperCase() + mode.slice(1)}</figcaption></figure>`).join("")}</div></div>`).join("")).join("");

  fs.writeFileSync(path.join(OUT, "findings.json"), JSON.stringify({ ...findings, scenarios: findings.scenarios.map(sc => ({ ...sc, screens: Object.fromEntries(Object.entries(sc.screens).map(([t, s]) =>
    [t, Object.fromEntries(Object.entries(s).map(([mode, { allText, styles, actions, ...m }]) => [mode, m]))])) })) }, null, 1));
  fs.writeFileSync(path.join(OUT, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UI audit</title>
<style>body{margin:0;padding:16px;font:15px/1.45 system-ui,sans-serif;background:#f4f5f7;color:#1b2430;max-width:1100px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:0;display:inline}
h2.sec{display:block;font-size:19px;margin:28px 0 4px}h3{font-size:15px;margin:0 0 8px}.card{background:#fff;border:1px solid #d8dde3;border-radius:12px;padding:12px;margin:10px 0}
summary{cursor:pointer}.pair{display:flex;gap:10px;overflow-x:auto;align-items:flex-start}figure{margin:0;flex:0 0 auto}img{width:195px;border:1px solid #d8dde3;border-radius:10px;display:block}
figcaption{font-size:12px;color:#5b6776;margin-top:2px}ul{margin:8px 0 0;padding-left:18px}small{color:#5b6776;font-weight:400}table{border-collapse:collapse;font-size:14px;margin:4px 0}
td,th{text-align:left;padding:4px 12px 4px 0;border-bottom:1px solid #e6e9ed}.z,.v,.val{display:inline-block;border-radius:999px;padding:1px 9px;font-size:13px;margin:2px 4px 2px 0;background:#eef1f4}
.z.easy,.v.quick{background:#d9f2e2;color:#145c33}.z.stretch,.v.noticeable{background:#fbefc9;color:#6b4d00}.z.hard,.v.slow{background:#fadbd8;color:#8e1c14}.val.odd{background:#fbefc9;color:#6b4d00}
.vals{display:flex;flex-wrap:wrap}h3.sub{margin:16px 0 0}.lead{max-width:760px}</style></head>
<body><h1>UI audit</h1><p class="lead">${total} measured issue${total === 1 ? "" : "s"} with the sample data, ${edgeTotal} more in edge cases, and ${notes} odd size${notes === 1 ? "" : "s"}, at ${W} × ${H}, with the sample data on ${findings.day}
(plus a first launch, long names and big numbers in kg, and text at 130% and 200%). Screenshots are taken with reduce motion on, so pictures hold still. Judge the rest by eye.</p>
${findings.source.length ? `<details class="card" open><summary><h2>Source (${findings.source.length})</h2></summary><ul>${findings.source.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}${list}
<h2 class="sec">Edge cases</h2><p class="lead">Issues that show up only with no data, long names and big numbers, or larger text. Expect some at 200%; look for what breaks at 130%.</p>${edges}
<h2 class="sec">Changes since the last run</h2>${changes}
<h2 class="sec">Thumb reach</h2><p class="lead">Holding the phone in the right hand: green is easy for the thumb, yellow a stretch, red needs the other hand or a regrip. The zones are this tool's own estimate. ★ marks controls used on every set.</p>${reach}
<h2 class="sec">Speed</h2><p class="lead">Time from a tap to the next frame on screen, with this computer slowed ${SLOW}× to stand in for a mid-range phone. Under 100 ms feels instant. Rough numbers: run it twice before acting on one.</p><div class="card">${speed}</div>
<h2 class="sec">Sizes in use</h2><p class="lead">Every value on the sample-data screens, with how many kinds of element use it (hover for which). Yellow ones are used once or sit within a pixel of a more common value: candidates to snap to a standard size.</p>${sizes}
${screens}</body></html>`);
  return { total, issues, edge };
}
