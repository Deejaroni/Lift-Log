// Lift Log: drawing engine for the exercise animations and the small front/back body map.
// ES module (see docs/DECISIONS.md). Figures are SVG markup built from a few key poses; nothing is fetched.

// Colors come from the app's tokens so figures follow light and dark mode.
const COL = {body:"var(--surface)", line:"var(--muted)", gear:"var(--muted)", plate:"var(--surface)", shadow:"var(--field)", red:"var(--red)", mapBody:"var(--line)"};
// Half-widths of each body part at its two ends.
const W = {torso:[11,8.5], neck:[3.5,3.5], upper:[5.2,4.2], fore:[4.2,3.4], thigh:[7.5,6], shin:[5.5,4], foot:[3.5,3]};
const SIDE_SEGS = [["H","K","thigh"],["K","A","shin"],["A","T","foot"],["S","E","upper"],["E","W","fore"]];
const SEG_ENDS = {torso:["S","H"], upper:["S","E"], fore:["E","W"], thigh:["H","K"], shin:["K","A"],
  upperL:["L","EL"], upperR:["R","ER"], foreL:["EL","WL"], foreR:["ER","WR"], thighL:["HL","KL"], thighR:["HR","KR"]};
const FLOOR = 168;
const r1 = n => Math.round(n*10)/10;

const mix = (A, B, t) => { const o = {}; for(const k in A) o[k] = B[k] ? [A[k][0]+(B[k][0]-A[k][0])*t, A[k][1]+(B[k][1]-A[k][1])*t] : A[k]; return o; };
// A limb piece: a tapered rod with round ends.
function rod(a, b, wa, wb, fill, extra=""){
  const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L;
  return `<path d="M${r1(a[0]+nx*wa)} ${r1(a[1]+ny*wa)}L${r1(b[0]+nx*wb)} ${r1(b[1]+ny*wb)}L${r1(b[0]-nx*wb)} ${r1(b[1]-ny*wb)}L${r1(a[0]-nx*wa)} ${r1(a[1]-ny*wa)}Z" fill="${fill}"${extra}/>`+
    `<circle cx="${r1(a[0])}" cy="${r1(a[1])}" r="${wa}" fill="${fill}"${extra}/><circle cx="${r1(b[0])}" cy="${r1(b[1])}" r="${wb}" fill="${fill}"${extra}/>`;
}
// Outlined pieces: all outlines first, then all fills, so joints read as one body.
const outlined = (parts, o=1.3) => parts.map(([a,b,wa,wb])=>rod(a,b,wa+o,wb+o,COL.line)).join("") + parts.map(([a,b,wa,wb])=>rod(a,b,wa,wb,COL.body)).join("");
// A muscle drawn as a band along one side of a body part, from fraction f0 to f1 of its length.
function band(a, b, wa, wb, f0, f1, side, opacity){
  const dx=b[0]-a[0], dy=b[1]-a[1], L=Math.hypot(dx,dy)||1, nx=-dy/L*side, ny=dx/L*side;
  const w = f => wa+(wb-wa)*Math.min(1,Math.max(0,f));
  const C = f => [a[0]+dx*f-nx*w(f)*.25, a[1]+dy*f-ny*w(f)*.25], E = f => [a[0]+dx*f+nx*w(f)*.92, a[1]+dy*f+ny*w(f)*.92];
  const c0=C(f0), c1=C(f1), e0=E(f0), e1=E(f1), fm=(f0+f1)/2, em=E(fm), cm=C(fm);
  return `<path d="M${r1(c0[0])} ${r1(c0[1])}L${r1(e0[0])} ${r1(e0[1])}Q${r1(em[0]+nx*w(fm)*.5)} ${r1(em[1]+ny*w(fm)*.5)} ${r1(e1[0])} ${r1(e1[1])}L${r1(c1[0])} ${r1(c1[1])}Q${r1(cm[0])} ${r1(cm[1])} ${r1(c0[0])} ${r1(c0[1])}Z" fill="${COL.red}" fill-opacity="${opacity}"/>`;
}

// ---------- equipment ----------
const gear = {
  plate: (p, r=17) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r}" fill="${COL.plate}" stroke="${COL.gear}" stroke-width="3.5"/><circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(r*.6)}" fill="none" stroke="${COL.gear}" stroke-width="1.4" opacity=".55"/><circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="2.6" fill="${COL.gear}"/>`,
  bell: p => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="7" fill="${COL.plate}" stroke="${COL.gear}" stroke-width="3"/><circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="2" fill="${COL.gear}"/>`,
  kettlebell: p => `<circle cx="${r1(p[0])}" cy="${r1(p[1]+9)}" r="8.5" fill="${COL.gear}"/><path d="M${r1(p[0]-5)} ${r1(p[1]+3)}Q${r1(p[0])} ${r1(p[1]-6)} ${r1(p[0]+5)} ${r1(p[1]+3)}" fill="none" stroke="${COL.gear}" stroke-width="3"/>`,
  handle: p => `<rect x="${r1(p[0]-3)}" y="${r1(p[1]-7)}" width="6" height="14" rx="3" fill="${COL.gear}"/>`,
  line: (a, b, w=1.5) => `<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke="${COL.gear}" stroke-width="${w}" stroke-linecap="round"/>`,
  dot: (p, r=4) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r}" fill="${COL.gear}"/>`,
  rect: (x, y, w, h, rx=3.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${COL.gear}"/>`,
  path: (d, w=4) => `<path d="${d}" fill="none" stroke="${COL.gear}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
  // Weight held in the hand, by kind: a plate end-on for a bar, or a dumbbell / kettlebell.
  held: (kind, p) => kind==="dumbbell" ? gear.bell(p) : kind==="kettlebell" ? gear.kettlebell(p) : kind==="cable" ? gear.handle(p) : kind==="none" ? "" : gear.plate(p),
};

// roles: muscle tag -> opacity (main ~1, also ~.38); a tag is a muscle group, optionally with a delt head ("Shoulders:rear").
function bandsFor(pat, p, roles, t){
  return (pat.bands||[]).map(b=>{
    // "Shoulders:front" lights up for that head, or for "Shoulders" when the head isn't known.
    const op = roles[b.m] ?? (b.m.includes(":") ? roles[b.m.split(":")[0]] : undefined); if(!op) return "";
    const [ka,kb] = SEG_ENDS[b.seg], [wa,wb] = W[b.seg.replace(/[LR]$/,"")];
    const live = op>=.9 ? .8+.2*t : op;
    return band(p[ka], p[kb], wa, wb, b.f[0], b.f[1], b.side, r1(live*100)/100);
  }).join("");
}
function sideBody(pat, p, roles, t){
  const far = k => p[k+"2"] || [p[k][0]-5, p[k][1]-2];
  const farParts = SIDE_SEGS.map(([a,b,w])=>[far(a), far(b), ...W[w]]);
  const nearParts = SIDE_SEGS.map(([a,b,w])=>[p[a], p[b], ...W[w]]);
  const torsoBands = bandsFor({bands:(pat.bands||[]).filter(b=>b.seg==="torso")}, p, roles, t);
  const limbBands = bandsFor({bands:(pat.bands||[]).filter(b=>b.seg!=="torso")}, p, roles, t);
  return `<g opacity=".5">${outlined(farParts)}</g>` + outlined([[p.S,p.H,...W.torso],[p.S,p.N,...W.neck]]) +
    `<circle cx="${r1(p.N[0])}" cy="${r1(p.N[1])}" r="10.8" fill="${COL.line}"/><circle cx="${r1(p.N[0])}" cy="${r1(p.N[1])}" r="9.5" fill="${COL.body}"/>` +
    torsoBands + outlined(nearParts) + limbBands;
}
// Front view: standing legs, torso shape, both arms. Torso regions (chest, abs, traps) are shapes on the torso.
const TORSO_REGION = {chest:"M86 50Q93 47 100 50Q107 47 114 50L113 62Q107 66 100 63Q93 66 87 62Z", abs:"M93 66H107L106 98H94Z", traps:"M87 41Q93 33 98 33V42Q92 44 87 44ZM113 41Q107 33 102 33V42Q108 44 113 44Z"};
function frontBody(pat, p, roles, t){
  const dy = p.L[1]-42, leg = (h, k, a) => [[h,k,...W.thigh],[k,a,...W.shin]];
  const legs = outlined([...(p.HL ? [...leg(p.HL,p.KL,p.AL), ...leg(p.HR,p.KR,p.AR)] : [[[93,104+dy*.3],[92,165],7,5],[[107,104+dy*.3],[108,165],7,5]]), [[100,30+dy],[100,40+dy],4,4]]);
  const torso = `<path d="M84 ${40+dy}Q100 ${34+dy} 116 ${40+dy}L112 104H88Z" fill="${COL.body}" stroke="${COL.line}" stroke-width="1.3"/>`;
  const regions = (pat.regions||[]).map(([k,m])=>{ const op = roles[m]; return op ? `<path d="${TORSO_REGION[k]}" transform="translate(0 ${r1(k==="traps"?dy:0)})" fill="${COL.red}" fill-opacity="${op>=.9?r1((.8+.2*t)*100)/100:op}"/>` : ""; }).join("");
  const head = `<circle cx="100" cy="${r1(p.N[1])}" r="10.8" fill="${COL.line}"/><circle cx="100" cy="${r1(p.N[1])}" r="9.5" fill="${COL.body}"/>`;
  const arms = outlined([[p.L,p.EL,...W.upper],[p.EL,p.WL,...W.fore],[p.R,p.ER,...W.upper],[p.ER,p.WR,...W.fore]]);
  return legs + torso + regions + head + arms + bandsFor(pat, p, roles, t);
}

// The figure for a pattern at time t (0 = start pose, 1 = end pose), as SVG markup.
export function figureMarkup(pat, t, roles={}, kind="barbell", opts={}){
  const p = mix(pat.A, pat.B || pat.A, t);
  const g = pat.gear ? pat.gear(p, kind, t) : {};
  const shadowX = pat.view==="front" ? 100 : (p.A[0]+p.T[0])/2;
  const shadow = opts.noShadow || pat.noShadow ? "" : `<ellipse cx="${r1(shadowX)}" cy="${FLOOR}" rx="30" ry="3.5" fill="${COL.shadow}"/>`;
  return shadow + (g.back||"") + (pat.view==="front" ? frontBody(pat, p, roles, t) : sideBody(pat, p, roles, t)) + (g.front||"");
}
export const FIGURE_VIEWBOX = "0 -4 200 176";
// A viewBox cropped to the body over the given moments of the movement, for small pictures.
export function poseBox(pat, ts=[1], pad=13){
  let x0=Infinity, y0=Infinity, x1=-Infinity, y1=-Infinity;
  for(const t of ts) for(const v of Object.values(mix(pat.A, pat.B || pat.A, t))) if(Array.isArray(v)){ x0=Math.min(x0,v[0]); y0=Math.min(y0,v[1]); x1=Math.max(x1,v[0]); y1=Math.max(y1,v[1]); }
  const w = Math.max(x1-x0+pad*2, 70), h = Math.max(y1-y0+pad*2, 70), cx = (x0+x1)/2, cy = (y0+y1)/2;
  return [cx-w/2, cy-h/2, w, h].map(r1).join(" ");
}
export { gear, FLOOR };

// ---------- small front/back body map ----------
// Regions per muscle group in a 58×44 box: front figure centered at x=14, back at x=44.
const MAP = {
  Chest:[["e",12,12.6,2.6,2],["e",16,12.6,2.6,2]], Abdominals:[["e",14,19.5,2.4,4]],
  "Shoulders:front":[["c",9.6,9.4,1.9],["c",18.4,9.4,1.9]], "Shoulders:side":[["c",7.4,10.2,1.7],["c",20.6,10.2,1.7],["c",37.4,10.2,1.7],["c",50.6,10.2,1.7]],
  "Shoulders:rear":[["c",39.6,9.4,1.9],["c",48.4,9.4,1.9]],
  Biceps:[["e",8.2,15.5,1.3,3],["e",19.8,15.5,1.3,3]], Triceps:[["e",38.2,15.5,1.3,3],["e",49.8,15.5,1.3,3]],
  Forearms:[["e",6.4,20.5,1.1,2.6],["e",21.6,20.5,1.1,2.6],["e",36.4,20.5,1.1,2.6],["e",51.6,20.5,1.1,2.6]],
  Back:[["e",44,12.6,4.4,2.6],["e",41,17,1.8,3.4],["e",47,17,1.8,3.4]], "Lower back":[["e",44,20.8,2,2.4]],
  Glutes:[["e",41.6,25.4,2.6,2.2],["e",46.4,25.4,2.6,2.2]], Quadriceps:[["e",11.5,30,2,5],["e",16.5,30,2,5]],
  Hamstrings:[["e",41.5,31,2,5],["e",46.5,31,2,5]], Calves:[["e",41.3,38.5,1.6,3],["e",46.7,38.5,1.6,3]],
};
MAP.Shoulders = [...MAP["Shoulders:front"], ...MAP["Shoulders:side"], ...MAP["Shoulders:rear"]];
export function bodyMapMarkup(roles){
  let s = "";
  for(const cx of [14,44]) s += `<circle cx="${cx}" cy="4" r="3.2" fill="${COL.mapBody}"/><rect x="${cx-5}" y="8" width="10" height="17" rx="3" fill="${COL.mapBody}"/>`+
    `<path d="M${cx-5.5} 9.5L${cx-8.5} 23M${cx+5.5} 9.5L${cx+8.5} 23M${cx-2.5} 25L${cx-3} 42M${cx+2.5} 25L${cx+3} 42" stroke="${COL.mapBody}" stroke-width="3.4" stroke-linecap="round"/>`;
  // Draw supporting muscles first so the main one sits on top.
  const order = Object.entries(roles).sort((a,b)=>a[1]-b[1]);
  for(const [m, op] of order) for(const r of MAP[m]||[]) s += r[0]==="c"
    ? `<circle data-m="${m}" cx="${r[1]}" cy="${r[2]}" r="${r[3]}" fill="${COL.red}" fill-opacity="${op}"/>`
    : `<ellipse data-m="${m}" cx="${r[1]}" cy="${r[2]}" rx="${r[3]}" ry="${r[4]}" fill="${COL.red}" fill-opacity="${op}"/>`;
  return s;
}
