// Mockup: ideas from the overnight review (2026-11-17), for approval before anything is built.
const style = `<style>
  .mk-screen>.mk-card{min-width:0}
  .ph{position:relative;border:1px solid var(--line);border-radius:14px;background:var(--bg);overflow:hidden}
  .ph .in{padding:12px}
  .lbl2{font-size:.85rem;color:var(--muted);margin:10px 0 4px}
  .spin{display:flex;align-items:center;border:1px solid var(--line);border-radius:12px;background:var(--field);min-height:52px}
  .spin span{width:52px;text-align:center;font-weight:700;color:var(--muted);font-size:1.3rem}
  .spin b{flex:1;text-align:center;font-size:1.7rem}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .row{display:flex;align-items:center;gap:10px;min-height:44px}
  .chev{margin-left:auto;color:var(--muted)}
  .tabs{display:flex;gap:4px;margin:8px;padding:6px;border-radius:999px;background:var(--pill)}
  .tabs i{flex:1;text-align:center;font-style:normal;font-weight:600;color:var(--on-pill);padding:10px 0;border-radius:999px;font-size:.9rem}
  .tabs i.on{background:var(--red);color:var(--on-accent);font-weight:800}
  .bar{display:flex;gap:8px;padding:8px 12px;background:var(--surface);border-top:1px solid var(--line)}
  .bar .primary{padding:12px}
  .bar .secondary{padding:12px 14px;min-width:88px}
  .det{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);margin-top:10px}
  .det small{color:var(--muted)}
  .fade{color:var(--muted);opacity:.6}
  .pl{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px}
  .pl h4{margin:0;font-size:1.1rem}
  .pl .sub{color:var(--muted);font-size:.85rem}
  .cnt{border:1px solid var(--line);border-radius:999px;padding:2px 8px;font-size:.85rem;color:var(--muted)}
  .go{border:1px solid var(--line);border-radius:10px;padding:8px 14px;color:var(--blue-ink);font-weight:700;background:var(--surface)}
  .prog{height:6px;border-radius:3px;background:var(--line);margin:8px 0 2px;overflow:hidden}
  .prog i{display:block;height:100%;width:33%;background:var(--green)}
  .set{display:flex;align-items:center;min-height:44px;border-top:1px solid var(--line);font-weight:700;font-size:1.1rem}
  .set small{display:block;font-weight:400;font-size:.85rem;color:var(--muted)}
  .old{display:flex;gap:8px;margin-left:auto}
  .old span{border:1px solid var(--line);border-radius:10px;padding:6px 10px;font-size:.9rem;font-weight:600}
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
  .stats div{border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--field)}
  .stats b{display:block;font-size:1.3rem}
  .stats small{color:var(--muted);font-size:.8rem}
  .prl{margin:10px 0 0;padding:0;list-style:none}
  .prl li{display:flex;gap:8px;align-items:center;min-height:32px}
  .tag{border-radius:999px;padding:1px 8px;font-size:.75rem;font-weight:700;background:var(--yellow);color:var(--ink)}
</style>`;
const tabs = on => `<div class="tabs">${["Log", "Plan", "History", "Progress"].map(t => `<i class="${t === on ? "on" : ""}">${t}</i>`).join("")}</div>`;
const weight = `<div class="lbl2">Weight lb</div><div class="spin"><span>−</span><b>185</b><span>+</span></div>
  <div class="two" style="margin-top:8px"><div><div class="lbl2">Reps</div><div class="spin"><span>−</span><b>5</b><span>+</span></div></div>
  <div><div class="lbl2">Sets</div><div class="spin"><span>−</span><b>1</b><span>+</span></div></div></div>`;

export default {
  title: "Overnight ideas: faster logging, a tidier day, a workout summary",
  note: "Five ideas from a review of the app at 390 px. Nothing here is built yet. Each one can be approved on its own.",
  layout: "screen",
  cards: [
    { title: "1. Log set stays in reach",
      caption: "Today the Log set button sits below to failure, reps left and the note, so on a phone you scroll down to log every set. " +
        "While the form is on screen, a slim bar above the tabs keeps Log set (with the numbers) and Rest under your thumb. It's the same bar the keyboard already gets.",
      html: style + `<div class="ph"><div class="in">${weight}<div class="lbl2 fade">To failure · Reps left in the tank · Add a note</div></div>
        <div class="bar"><button type="button" class="primary">Log set · 185 × 5</button><button type="button" class="secondary">Rest</button></div>${tabs("Log")}</div>` },
    { title: "2. Set details fold into one row",
      caption: "To failure, reps left and the note move into one Details row that opens when tapped, so the form is about 200 px shorter. It shows what's set, like 'Failure on set 3 · 2 left'.",
      html: style + `<div class="ph"><div class="in">${weight}
        <div class="det"><b>Details</b><small>To failure, reps left, note</small><span class="chev">›</span></div>
        <div class="det"><b>Details</b><small>Failure on set 3 · 2 left · “Seat 4”</small><span class="chev">›</span></div>
        <div style="display:flex;gap:8px;margin-top:12px"><button type="button" class="primary">Log set</button><button type="button" class="secondary">Rest</button></div></div>${tabs("Log")}</div>` },
    { title: "3. Today's plan folds once you start",
      caption: "The plan card fills the whole first screen, so the form starts below the fold. After your first set it folds to one line with a progress bar and the next exercise. Tap to open the full list.",
      html: style + `<div class="ph"><div class="in"><div class="pl">
        <div class="row" style="min-height:0"><h4>Legs</h4><span class="sub">2 of 6 exercises · 7 of 20 sets</span><span class="chev">⌄</span></div>
        <div class="prog"><i></i></div>
        <div class="row"><div><b>Next: Leg press</b><div class="sub">3 × 10–12 · first time: pick a weight for 10–12</div></div><span class="cnt" style="margin-left:auto">0/3</span><span class="go">Start</span></div></div>
        ${weight}</div>${tabs("Log")}</div>` },
    { title: "4. History edits the same way as Log",
      caption: "Log edits a set by tapping it. History still uses ··· menus and Edit / Delete buttons. History would match: tap a set to open the same editor, with delete and Undo inside it.",
      html: style + `<div class="ph"><div class="in"><div class="pl"><h4>Squat</h4>
        <div class="lbl2">Now</div>
        <div class="set">230 lb × 5<div class="old"><span style="color:var(--blue-ink)">Edit</span><span style="color:var(--red-ink)">Delete</span></div></div>
        <div class="set">230 lb × 5<span class="chev">···</span></div>
        <div class="lbl2">Proposed</div>
        <div class="set"><div>230 lb × 5<small>Barbell · High-bar</small></div><span class="chev">›</span></div>
        <div class="set"><div>230 lb × 5<small>Barbell · High-bar</small></div><span class="chev">›</span></div></div></div>${tabs("History")}</div>` },
    { title: "5. A summary when you finish",
      caption: "A Finish workout button at the end of today's list, which also shows after an hour with no sets. It gives a short summary: time, sets, volume and PRs, compared with the last time you did this workout. Nothing is shared or sent anywhere.",
      html: style + `<div class="ph"><div class="in"><div class="pl"><h4>Legs · done</h4><div class="sub">Wed, Mar 4 · 5:12–6:24 pm</div>
        <div class="stats"><div><b>1:12</b><small>Time</small></div><div><b>18</b><small>Sets</small></div><div><b>24,350</b><small>lb volume, +6%</small></div></div>
        <ul class="prl"><li><span class="tag">PR</span>Squat 230 × 5 · est. 1RM 268 lb</li><li><span class="tag">PR</span>Leg press 410 × 10</li></ul>
        <div style="display:flex;gap:8px;margin-top:10px"><button type="button" class="primary">Done</button></div></div></div>${tabs("Log")}</div>` },
  ],
};
