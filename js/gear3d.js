// Lift Log: equipment for the 3D figures, built from simple shapes: bars, dumbbells, kettlebells, cable handles and
// plates held in the hands, plus each pattern's own props (benches, machines, frames). See js/figure3d.js.
import * as THREE from "three";

const G = {};   // shared geometries
function geo(){
  if(G.bar) return;
  G.bar = new THREE.CylinderGeometry(.014, .014, 1, 14).rotateZ(Math.PI / 2);
  G.plate = new THREE.CylinderGeometry(.22, .22, .05, 36).rotateZ(Math.PI / 2);
  G.db = new THREE.CylinderGeometry(.065, .065, .04, 24).rotateZ(Math.PI / 2);
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.cyl = new THREE.CylinderGeometry(.5, .5, 1, 20);
  G.cable = new THREE.CylinderGeometry(.005, .005, 1, 6);
  G.bell = new THREE.SphereGeometry(.085, 20, 14);
  G.loop = new THREE.TorusGeometry(.055, .011, 8, 24, Math.PI);
  G.ball = new THREE.SphereGeometry(1, 20, 14);
}
const mesh = (g, m) => new THREE.Mesh(g, m);
const _x = new THREE.Vector3(1, 0, 0), _y = new THREE.Vector3(0, 1, 0), _v = new THREE.Vector3(), _u = new THREE.Vector3();
const X_TO_THUMB = new THREE.Quaternion().setFromUnitVectors(_x, new THREE.Vector3(0, 0, 1));
const palm = (J, s) => J[`hand_${s}`].clone().lerp(J[`handtip_${s}`], .32);
const mid = J => palm(J, "L").add(palm(J, "R")).multiplyScalar(.5);
const palmNormal = (J, s) => new THREE.Vector3(0, -1, 0).applyQuaternion(J[`handQ_${s}`]);

// ---------- held weights ----------
function barbell(M, len = 1.9){
  const g = new THREE.Group(), b = mesh(G.bar, M.metal); b.scale.x = len; g.add(b);
  const e = len / 2 - .23;
  for(const x of [-e, e]){ const p = mesh(G.plate, M.plate); p.position.x = x; g.add(p); const q = mesh(G.plate, M.plate); q.scale.set(1, .78, .78); q.position.x = x + Math.sign(x) * .05; g.add(q); }
  return g;
}
function dumbbell(M){
  const g = new THREE.Group(), b = mesh(G.bar, M.metal); b.scale.set(.3, 1.3, 1.3); g.add(b);
  for(const x of [-.105, .105]){ const p = mesh(G.db, M.plate); p.position.x = x; g.add(p); }
  return g;
}
function kettlebell(M){
  // The handle runs along X through the origin; the bell hangs below it (-Y).
  const g = new THREE.Group(), h = mesh(G.loop, M.metal); h.rotation.x = Math.PI; h.position.y = -.02; g.add(h);
  const b = mesh(G.bell, M.plate); b.position.y = -.12; g.add(b);
  return g;
}
function handle(M){ const g = new THREE.Group(), b = mesh(G.bar, M.metal); b.scale.set(.14, 1.6, 1.6); g.add(b); return g; }
function straightBar(M){ const g = new THREE.Group(), b = mesh(G.bar, M.metal); b.scale.set(.6, 1.4, 1.4); g.add(b); return g; }
function latBar(M){
  const g = new THREE.Group(), b = mesh(G.bar, M.metal); b.scale.set(.9, 1.4, 1.4); g.add(b);
  for(const x of [-1, 1]){ const e = mesh(G.bar, M.metal); e.scale.set(.32, 1.4, 1.4); e.position.set(x * .58, -.04, 0); e.rotation.z = x * -.28; g.add(e); }
  return g;
}
function plate(M){ const g = new THREE.Group(), p = mesh(G.plate, M.plate); p.scale.set(.8, .9, .9); g.add(p); return g; }
const IMPLEMENT = {barbell: barbell, dumbbell: dumbbell, kettlebell: kettlebell, cable: handle};

// What the hands hold for a pattern and a kind of weight: "bar" (one bar in both hands), "each" (one per hand),
// "one" (a single weight in both hands), "left" (one hand only), "plate", or "" (nothing).
function holdOf(P, kind){
  const h = P.hold;
  if(typeof h === "string") return h;
  if(h && h[kind] != null) return h[kind];
  if(h && h.default != null) return h.default;
  return kind === "barbell" ? "bar" : kind === "dumbbell" || kind === "kettlebell" || kind === "cable" ? "each" : "";
}

// A builder for a pattern's own props, in world meters (+Z is the figure's front).
function builder(g, M){
  const add = o => (g.add(o), o);
  return {
    M,
    box: (w, h, d, x, y, z, m = M.frame, rx = 0) => { const b = mesh(G.box, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.rotation.x = rx; return add(b); },
    // An upright post or a rod between two points.
    rod: (a, b, r = .025, m = M.frame) => { const c = mesh(G.cyl, m), A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
      c.scale.set(r * 2, d.length(), r * 2); c.position.copy(A).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(_y, d.normalize()); return add(c); },
    ball: (r, x, y, z, m = M.pad) => { const b = mesh(G.ball, m); b.scale.setScalar(r); b.position.set(x, y, z); return add(b); },
    bar: (len = 1.9) => add(barbell(M, len)),
    group: () => add(new THREE.Group()),
  };
}
function line(g, M){ const c = mesh(G.cable, M.metal); g.add(c); return c; }
function stretch(c, a, b){ _v.copy(b).sub(a); c.position.copy(a).addScaledVector(_v, .5); c.scale.y = Math.max(.001, _v.length()); c.quaternion.setFromUnitVectors(_y, _v.normalize()); }

// One group per pattern and kind of weight, built once.
const cache = new WeakMap();
function buildGear(root, P, kind, M){
  geo();
  const g = new THREE.Group(), B = builder(g, M), parts = P.props ? P.props(B) || {} : {};
  const hold = holdOf(P, kind), imp = P.implement || (kind === "none" ? "" : kind);
  const make = hold === "plate" ? plate : IMPLEMENT[imp] || null, items = {};
  if(hold === "bar" && imp){
    // A barbell, or for cables and machines a straight handle (lat bars bend down at the ends).
    const b = imp === "barbell" ? barbell(M, P.barLen || 1.9) : imp === "lat" ? latBar(M) : imp === "dumbbell" || imp === "kettlebell" ? null : straightBar(M);
    if(b){ items.bar = b; g.add(b); }
  } else if(hold === "each" && make){ items.L = make(M); items.R = make(M); g.add(items.L, items.R); }
  else if((hold === "one" || hold === "left" || hold === "plate") && make){ items.one = make(M); g.add(items.one); }
  // Cables run from the handles (or the bar) to the pattern's pulley (low in front when it doesn't say).
  const pulley = P.cable || (kind === "cable" && hold ? [0, .12, .6] : null);
  const cables = pulley ? [line(g, M)].concat(hold === "each" ? [line(g, M)] : []) : [];
  const cableAt = pulley && new THREE.Vector3(...(Array.isArray(pulley) ? pulley : pulley.L));
  const cableR = pulley && new THREE.Vector3(...(Array.isArray(pulley) ? pulley : pulley.R));
  g.userData.place = (J, s) => {
    if(items.bar){ const c = mid(J); items.bar.position.copy(c); _u.copy(palm(J, "L")).sub(palm(J, "R"));
      if(_u.lengthSq() < 1e-6) _u.set(1, 0, 0); items.bar.quaternion.setFromUnitVectors(_x, _u.normalize()); }
    for(const side of ["L", "R"]) if(items[side]) inHand(items[side], J, side, make === kettlebell);
    if(items.one){
      if(hold === "left") inHand(items.one, J, "L", make === kettlebell);
      else if(hold === "plate"){ items.one.position.copy(mid(J)); items.one.quaternion.copy(J.chestQ).multiply(X_TO_THUMB); }
      else { // A single weight held in both hands: a dumbbell stands on end, a kettlebell hangs by its horns.
        items.one.position.copy(mid(J));
        if(make === dumbbell){ items.one.quaternion.copy(J.chestQ).multiply(new THREE.Quaternion().setFromUnitVectors(_x, _y)); items.one.position.addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(J.chestQ), .06); }
        else { _u.copy(palm(J, "L")).sub(palm(J, "R")).normalize(); items.one.quaternion.setFromUnitVectors(_x, _u); }
      }
    }
    if(cables.length && (items.L || items.bar || items.one)){
      const ends = hold === "each" ? [items.L.position, items.R.position] : [items.bar ? items.bar.position : items.one ? items.one.position : mid(J)];
      cables.forEach((c, i) => stretch(c, ends[i], i ? cableR : cableAt));
    }
    if(P.move) P.move(parts, J, s);
  };
  g.userData.track = hold === "bar" || hold === "one" || hold === "plate" ? J => mid(J) : hold === "each" || hold === "left" ? J => palm(J, "L") : null;
  root.add(g);
  return g;
}
// A weight in one hand: the handle across the palm, a little toward the palm; a kettlebell hangs from it.
function inHand(o, J, s, bell){
  const q = J[`handQ_${s}`];
  o.quaternion.copy(q).multiply(X_TO_THUMB);
  o.position.copy(palm(J, s)).addScaledVector(palmNormal(J, s), .012);
  if(bell){ // Turn about the handle so the bell hangs down (or rests on the back of the wrist when the hand is up).
    _u.set(1, 0, 0).applyQuaternion(o.quaternion);
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(o.quaternion), want = new THREE.Vector3(0, -1, 0).addScaledVector(palmNormal(J, s), -.6);
    want.addScaledVector(_u, -want.dot(_u)); down.addScaledVector(_u, -down.dot(_u));
    if(want.lengthSq() > 1e-6 && down.lengthSq() > 1e-6){ want.normalize(); down.normalize();
      o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(_u, Math.atan2(new THREE.Vector3().crossVectors(down, want).dot(_u), down.dot(want)))); }
  }
}
function gearFor(root, P, kind, M){
  let m = cache.get(P); if(!m) cache.set(P, m = new Map());
  if(!m.has(kind)) m.set(kind, buildGear(root, P, kind, M));
  return m.get(kind);
}

export { gearFor, holdOf, buildGear, palm };
