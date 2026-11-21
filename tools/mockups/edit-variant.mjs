// Mockup: change a logged set's variant (equipment, attachment, grip, position) in the set editor.
const style = `<style>
  .ph{border:1px solid var(--line);border-radius:14px;background:var(--bg);padding:12px}
  .ph .edit-box{margin:0}
  .spin2{display:flex;align-items:center;border:1px solid var(--line);border-radius:12px;background:var(--field);min-height:48px}
  .spin2 span{width:44px;text-align:center;font-weight:700;color:var(--muted);font-size:1.2rem}
  .spin2 b{flex:1;text-align:center;font-size:1.4rem}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .l{font-size:.85rem;color:var(--muted);margin:10px 0 4px;font-weight:600}
  .row{display:flex;align-items:center;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
  .row .chev{margin-left:auto;color:var(--muted)}
  .set{display:flex;align-items:center;min-height:44px;font-weight:700;font-size:1.05rem;border-bottom:1px solid var(--line)}
  .set small{font-weight:400;color:var(--muted);font-size:.85rem;margin-left:8px}
  .hl{outline:2px solid var(--blue);outline-offset:3px;border-radius:12px}
  .acts{display:flex;gap:8px;margin-top:12px}
  .acts .primary{flex:1;padding:12px}.acts .secondary{padding:12px 14px}
  .sw2{display:flex;align-items:center;gap:10px;min-height:44px;margin-top:8px;font-size:.95rem}
  .sw2 i{width:44px;height:26px;border-radius:13px;background:var(--green);position:relative;flex:none}
  .sw2 i:after{content:"";position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:var(--surface)}
</style>`;
const top = `<div class="set">Bench press<small>Set 2 · 185 lb × 8</small></div>
  <div class="l">Weight lb · Reps</div><div class="two"><div class="spin2"><span>−</span><b>185</b><span>+</span></div><div class="spin2"><span>−</span><b>8</b><span>+</span></div></div>`;
const rest = `<div class="l">To failure · Reps left · Note</div><div class="row" style="color:var(--muted)">(unchanged)</div>`;
const acts = `<div class="acts"><button type="button" class="primary">Save changes</button><button type="button" class="secondary">Cancel</button></div>`;

export default {
  title: "Change the equipment of a logged set",
  note: "Tap a logged set (Log or History). The editor gets the same chips as the Log form, so you can switch Barbell to Dumbbell, change the attachment, grip or position, without deleting the set.",
  layout: "screen",
  cards: [
    { title: "Now",
      caption: "The only Equipment row is the setup (bar, plates, bench). There's no way to switch Barbell to Dumbbell, or change grip, after logging.",
      html: style + `<div class="ph">${top}<div class="l">Equipment</div><div class="row">Barbell · Plates only (bar added)<span class="chev">›</span></div>${rest}${acts}</div>` },
    { title: "Proposed",
      caption: "The variant chips from the Log form sit right under weight and reps. The setup row is renamed Setup, so it isn't confused with the equipment chip.",
      html: style + `<div class="ph">${top}<div class="l">Variant</div>
        <div class="vchips hl" style="margin-top:0"><button type="button" class="vchip" aria-pressed="true">Barbell ▾</button><button type="button" class="vchip" aria-pressed="true">Flat ▾</button><button type="button" class="vchip" aria-pressed="false">+ Grip</button></div>
        <div class="l">Setup</div><div class="row">Plates only (bar added)<span class="chev">›</span></div>${rest}${acts}</div>` },
    { title: "Proposed: changing it",
      caption: "Tap a chip to pick. Switching to Dumbbell also switches the setup (no bar). If other sets of this exercise today had the same old variant, a switch (on) changes them too, so you fix the whole exercise in one save.",
      html: style + `<div class="ph">${top}<div class="l">Variant</div>
        <div class="vchips" style="margin-top:0"><button type="button" class="vchip" aria-pressed="true">Dumbbell ▾</button><button type="button" class="vchip" aria-pressed="true">Flat ▾</button><button type="button" class="vchip" aria-pressed="false">+ Grip</button></div>
        <div class="vedit"><div class="vrow">Equipment</div><div class="vopts"><button type="button" class="vopt" aria-pressed="false">Barbell</button><button type="button" class="vopt" aria-pressed="true">Dumbbell</button><button type="button" class="vopt" aria-pressed="false">Smith machine</button><button type="button" class="vopt" aria-pressed="false">Machine</button></div>
        <div class="vrow">Position</div><div class="vopts"><button type="button" class="vopt" aria-pressed="true">Flat</button><button type="button" class="vopt" aria-pressed="false">Incline</button><button type="button" class="vopt" aria-pressed="false">Decline</button></div></div>
        <div class="sw2 hl"><i></i>Change all 4 bench press sets from today</div>
        <div class="l">Setup</div><div class="row">Dumbbells · per hand<span class="chev">›</span></div>${acts}</div>` },
  ],
};
