// Lift Log: 3D exercise figures. One shared three.js renderer draws every figure on screen (phones allow only a
// few WebGL views), each into its own 2D canvas. Poses are written as the direction each body part points, so
// a movement is two key poses (contracted and stretched) played at one tempo. ES module, no start-up code.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// ---------- tempo: 2 s lowering, a short pause, 1 s lifting, a short pause ----------
const TEMPO = [["ecc", 2.0], ["holdS", 0.4], ["con", 1.0], ["holdC", 0.4]];
const CYCLE = TEMPO.reduce((a, p) => a + p[1], 0);
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
// 0 = contracted, 1 = stretched, and the phase, at time t (seconds).
function phaseAt(t){
  let x = ((t % CYCLE) + CYCLE) % CYCLE;
  for(const [name, d] of TEMPO){ if(x < d){ const k = x / d;
    return name === "ecc" ? {s: ease(k), name} : name === "con" ? {s: 1 - ease(k), name, k} : {s: name === "holdS" ? 1 : 0, name}; } x -= d; }
  return {s: 0, name: "holdC"};
}

// ---------- the bones a pose can aim, in order, with the child that gives each one's direction ----------
const AIM = [["hips","spine"],["spine","chest"],["chest","neck"],["neck","head"],["head","headtop"]];
for(const s of ["L","R"]) AIM.push([`shoulder_${s}`,`upperarm_${s}`],[`upperarm_${s}`,`forearm_${s}`],[`forearm_${s}`,`hand_${s}`],[`hand_${s}`,`handtip_${s}`],
  [`thigh_${s}`,`shin_${s}`],[`shin_${s}`,`foot_${s}`],[`foot_${s}`,`toe_${s}`]);

// Pose shorthand: arms and legs are given for the left side; the right mirrors it (x flipped) unless given.
const STAND = {hips:[0,1,0], spine:[0,1,0], chest:[0,1,0], neck:[0,1,0], head:[0,1,0], shoulder:[1,0,0],
  upperarm:[.12,-1,0], forearm:[.08,-1,.05], hand:[0,-1,.05], thigh:[.04,-1,0], shin:[0,-1,-.02], foot:[0,-.35,1]};
function expand(p){
  const o = {}, P = {...STAND, ...p};
  for(const k of ["hips","spine","chest","neck","head"]) o[k] = new THREE.Vector3(...P[k]).normalize();
  for(const part of ["shoulder","upperarm","forearm","hand","thigh","shin","foot"]){
    const l = P[part], r = P[part + "R"] || [-l[0], l[1], l[2]];
    o[`${part}_L`] = new THREE.Vector3(...l).normalize(); o[`${part}_R`] = new THREE.Vector3(...r).normalize();
  }
  return o;
}

// ---------- equipment, built from simple shapes ----------
const G = {};   // shared geometries
function geo(){
  if(G.ready) return; G.ready = true;
  G.bar = new THREE.CylinderGeometry(.014, .014, 1, 16); G.bar.rotateZ(Math.PI / 2);
  G.plate = new THREE.CylinderGeometry(.22, .22, .05, 40); G.plate.rotateZ(Math.PI / 2);
  G.db = new THREE.CylinderGeometry(.075, .075, .04, 28); G.db.rotateZ(Math.PI / 2);
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.cable = new THREE.CylinderGeometry(.005, .005, 1, 6);
  G.shaft = new THREE.CylinderGeometry(.012, .012, 1, 12); G.cone = new THREE.ConeGeometry(.04, .08, 18);
  G.shadow = new THREE.CircleGeometry(1, 40); G.shadow.rotateX(-Math.PI / 2);
}
const M = {};   // materials, recolored from the app's color tokens
function mats(){
  if(M.body) return;
  const std = o => new THREE.MeshStandardMaterial({roughness: .62, metalness: 0, ...o});
  Object.assign(M, {body: std({}), main: std({}), also: std({}), metal: std({metalness: .5, roughness: .35}), plate: std({roughness: .5}),
    pad: std({roughness: .8}), frame: std({metalness: .3, roughness: .45}), arrow: new THREE.MeshBasicMaterial({transparent: true}),
    shadow: new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, opacity: .18})});
}
function readColors(){
  const cs = getComputedStyle(document.documentElement), c = v => new THREE.Color().setStyle(cs.getPropertyValue(v).trim() || "#888");
  const surface = c("--surface"), muted = c("--muted"), ink = c("--ink"), red = c("--red"), line = c("--line");
  M.body.color.copy(surface).lerp(muted, .42);
  M.main.color.copy(red);
  M.also.color.copy(red).lerp(M.body.color, .5);
  M.metal.color.copy(muted).lerp(ink, .3); M.plate.color.copy(ink).lerp(muted, .25);
  M.pad.color.copy(line).lerp(ink, .35); M.frame.color.copy(muted);
  M.arrow.color.copy(c("--blue")); M.shadow.color.copy(ink);
}
const mesh = (g, m) => new THREE.Mesh(g, m);
const scaled = (o, x, y, z) => { o.scale.set(x, y, z); return o; };
function barbell(len = 1.9){
  const g = new THREE.Group(); g.add(scaled(mesh(G.bar, M.metal), len, 1, 1));
  for(const x of [-.72, .72]){ const p = mesh(G.plate, M.plate); p.position.x = x; g.add(p); const q = mesh(G.plate, M.plate); q.scale.set(1, .78, .78); q.position.x = x * 1.05; g.add(q); }
  return g;
}
function dumbbell(){
  const g = new THREE.Group(); g.add(scaled(mesh(G.bar, M.metal), .3, 1.3, 1.3));
  for(const x of [-.11, .11]){ const p = mesh(G.db, M.plate); p.position.x = x; g.add(p); }
  return g;
}
const box = (w, h, d, m, x, y, z) => { const b = mesh(G.box, m); b.scale.set(w, h, d); b.position.set(x, y, z); return b; };

// ---------- exercises for the prototype ----------
// Each: two poses, how the body is placed (feet planted, or the hips at a spot), the muscles worked, the gear,
// and the point the direction arrow follows.
const EXERCISES = {
  squat: {
    name: "High-bar back squat", roles: {Quadriceps: 1, Glutes: .38}, anchor: "feet",
    contracted: {upperarm: [.56, -.69, -.44], forearm: [.08, 1, .16], hand: [0, .9, .3]},
    stretched: {hips: [0, .9, .44], spine: [0, .82, .57], chest: [0, .85, .52], neck: [0, .9, .2], head: [0, 1, .15],
      upperarm: [.56, -.69, -.44], forearm: [.08, 1, .16], hand: [0, .9, .3],
      thigh: [.2, -.25, 1], shin: [.08, -.92, -.38], foot: [.05, -.3, 1]},
    gear(g){ g.bar = barbell(); g.add(g.bar); },
    place(g, J){ g.bar.position.copy(J.neck).add(new THREE.Vector3(0, -.02, -.1).applyQuaternion(J.chestQ)); g.bar.quaternion.copy(J.chestQ); },
    track: J => J.neck.clone(),
  },
  bench: {
    name: "Barbell bench press — flat", roles: {Chest: 1, "Shoulders:front": .38, Triceps: .38}, anchor: {hips: [0, .56, .05]},
    contracted: {hips: [0, 0, -1], spine: [0, .05, -1], chest: [0, .03, -1], neck: [0, .1, -1], head: [0, .1, -1],
      upperarm: [.3, -.05, 1], forearm: [.05, 0, 1], hand: [0, .1, 1],
      thigh: [.28, 0, 1], shin: [.1, -1, .15], foot: [0, -.2, 1]},
    stretched: {hips: [0, 0, -1], spine: [0, .05, -1], chest: [0, .03, -1], neck: [0, .1, -1], head: [0, .1, -1],
      upperarm: [.86, .2, -.42], forearm: [.05, .05, 1], hand: [0, .1, 1],
      thigh: [.28, 0, 1], shin: [.1, -1, .15], foot: [0, -.2, 1]},
    gear(g){ g.add(box(.3, .06, 1.25, M.pad, 0, .44, -.2)); g.add(box(.06, .42, .06, M.frame, 0, .21, .25)); g.add(box(.06, .42, .06, M.frame, 0, .21, -.7));
      g.bar = barbell(); g.add(g.bar); },
    place(g, J){ g.bar.position.copy(J.hand_L).add(J.hand_R).multiplyScalar(.5); },
    track: J => J.hand_L.clone().add(J.hand_R).multiplyScalar(.5),
  },
  pulldown: {
    name: "Lat pulldown — wide overhand", roles: {Back: 1, Biceps: .38, "Shoulders:rear": .38}, anchor: {hips: [0, .62, 0]},
    contracted: {spine: [0, .96, -.27], chest: [0, .95, -.3], neck: [0, 1, -.05], head: [0, 1, .05],
      upperarm: [.82, -.5, -.28], forearm: [-.05, 1, .05], hand: [0, 1, 0],
      thigh: [.12, 0, 1], shin: [0, -1, .05], foot: [0, -.3, 1]},
    stretched: {spine: [0, 1, -.1], chest: [0, 1, -.12],
      upperarm: [.55, .83, 0], forearm: [.38, .92, 0], hand: [.2, 1, 0],
      thigh: [.12, 0, 1], shin: [0, -1, .05], foot: [0, -.3, 1]},
    gear(g){ g.add(box(.38, .07, .42, M.pad, 0, .5, .12)); g.add(box(.06, .5, .06, M.frame, 0, .25, .12));
      g.add(box(.36, .07, .1, M.pad, 0, .78, .32));
      g.add(box(.08, 2.4, .08, M.frame, 0, 1.2, -.42)); g.add(box(.5, .08, .5, M.frame, 0, 2.4, -.2));
      g.bar = new THREE.Group(); const b = mesh(G.bar, M.metal); b.scale.set(1.2, 1.4, 1.4); g.bar.add(b);
      for(const x of [-.6, .6]){ const e = mesh(G.bar, M.metal); e.scale.set(.18, 1.4, 1.4); e.position.set(x * 1.05, -.03, 0); e.rotation.z = x > 0 ? -.5 : .5; g.bar.add(e); }
      g.add(g.bar); g.cable = mesh(G.cable, M.metal); g.add(g.cable); },
    place(g, J){ g.bar.position.copy(J.hand_L).add(J.hand_R).multiplyScalar(.5);
      const top = new THREE.Vector3(0, 2.36, -.1), d = top.clone().sub(g.bar.position);
      g.cable.position.copy(g.bar.position).addScaledVector(d, .5); g.cable.scale.y = d.length(); g.cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); },
    track: J => J.hand_L.clone().add(J.hand_R).multiplyScalar(.5),
  },
  lateral: {
    name: "Dumbbell lateral raise", roles: {"Shoulders:side": 1, Back: .38}, anchor: "feet",
    contracted: {upperarm: [1, .02, .15], forearm: [1, .06, .25], hand: [1, 0, .3]},
    stretched: {upperarm: [.2, -1, .12], forearm: [.15, -1, .22], hand: [.1, -1, .25]},
    gear(g){ g.dl = dumbbell(); g.dr = dumbbell(); g.add(g.dl, g.dr); },
    place(g, J){ for(const [d, s] of [[g.dl, "L"], [g.dr, "R"]]){ d.position.copy(J[`hand_${s}`]).lerp(J[`handtip_${s}`], .45); } },
    track: J => J.hand_L.clone(),
  },
};

// ---------- the shared renderer ----------
let renderer, scene, camera, model, bones = {}, rest = {}, bodyParts = [], gearRoot, arrow, shadow, ready = null;
const views = new Set();
async function load(url){
  if(ready) return ready;
  ready = (async () => {
    geo(); mats(); readColors();
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
    renderer.setPixelRatio(1); renderer.setSize(720, 720, false); renderer.setScissorTest(true);
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(2.5, 4, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, .8); rim.position.set(-3, 2, -2.5); scene.add(rim);
    camera = new THREE.PerspectiveCamera(30, 1, .05, 50);
    const gltf = await new GLTFLoader().loadAsync(url);
    model = gltf.scene; scene.add(model);
    model.traverse(o => {
      if(o.isBone) bones[o.name] = o;
      if(o.isMesh){ o.frustumCulled = false; const n = (o.material.name || "").replace(/^m_/, "");
        bodyParts.push({mesh: o, muscle: n === "skin" ? null : n.replace("Shoulders_", "Shoulders:").replace("Lower_back", "Lower back")}); }
    });
    for(const [b] of AIM) rest[b] = bones[b].quaternion.clone();
    model.updateMatrixWorld(true);
    rest.chestWorldInv = bones.chest.getWorldQuaternion(new THREE.Quaternion()).invert();
    rest.feet = bones.foot_L.getWorldPosition(new THREE.Vector3());
    gearRoot = new THREE.Group(); scene.add(gearRoot);
    arrow = new THREE.Group(); const sh = mesh(G.shaft, M.arrow); sh.scale.y = .16; sh.position.y = .08; const co = mesh(G.cone, M.arrow); co.position.y = .2; arrow.add(sh, co); scene.add(arrow);
    shadow = mesh(G.shadow, M.shadow); shadow.scale.setScalar(.55); scene.add(shadow);
    const recolor = () => { readColors(); };
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", recolor);
    new MutationObserver(recolor).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
    requestAnimationFrame(loop);
  })();
  return ready;
}

// Aim each bone at its target direction, top of the body down, so children follow their parents.
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _w = new THREE.Quaternion(), _p = new THREE.Quaternion();
const ARM = /^(shoulder|upperarm|forearm|hand)_/;
const _d = new THREE.Quaternion(), _t = new THREE.Vector3();
function pose(dirs){
  for(const [b] of AIM) bones[b].quaternion.copy(rest[b]);
  model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  for(const [b, c] of AIM){
    const bone = bones[b]; let t = dirs[b]; if(!t) continue;
    // Arms are written relative to the chest (y toward the head, z out of the chest), so they lean with the torso.
    if(ARM.test(b)){ bones.chest.getWorldQuaternion(_d).multiply(rest.chestWorldInv); t = _t.copy(t).applyQuaternion(_d); }
    bone.getWorldPosition(_a); bones[c].getWorldPosition(_b);
    _q.setFromUnitVectors(_b.sub(_a).normalize(), t);
    bone.getWorldQuaternion(_w).premultiply(_q); bone.parent.getWorldQuaternion(_p);
    bone.quaternion.copy(_p.invert().multiply(_w)); bone.updateMatrixWorld(true);
  }
}
const JOINTS = ["hips","chest","neck","head","headtop","hand_L","hand_R","handtip_L","handtip_R","foot_L","foot_R","toe_L","toe_R","forearm_L","forearm_R","shin_L","shin_R"];
function joints(){ const J = {}; for(const n of JOINTS) J[n] = bones[n].getWorldPosition(new THREE.Vector3());
  J.chestQ = bones.chest.getWorldQuaternion(new THREE.Quaternion()).multiply(rest.chestWorldInv); return J; }
// Interpolated pose for an exercise at stretch s (0 contracted .. 1 stretched); places the body and returns its joints.
function placeAt(ex, s){
  const A = ex._c || (ex._c = expand(ex.contracted)), B = ex._s || (ex._s = expand(ex.stretched)), d = {};
  for(const k in A) d[k] = A[k].clone().lerp(B[k], s).normalize();
  pose(d);
  if(ex.anchor === "feet"){ const f = bones.foot_L.getWorldPosition(new THREE.Vector3()), g = bones.foot_R.getWorldPosition(new THREE.Vector3());
    model.position.copy(rest.feet).sub(f.add(g).multiplyScalar(.5)); model.position.x = 0; }
  else { const h = bones.hips.getWorldPosition(new THREE.Vector3()); model.position.set(...ex.anchor.hips).sub(h); }
  model.updateMatrixWorld(true);
  return joints();
}
// Camera framing per exercise, from the joints at both ends of the movement.
function frame(ex){
  if(ex._frame) return ex._frame;
  const b = new THREE.Box3();
  for(const s of [0, 1]){ const J = placeAt(ex, s); for(const k in J) b.expandByPoint(J[k]); }
  b.expandByPoint(new THREE.Vector3(0, 0, 0));
  ex._frame = {center: b.getCenter(new THREE.Vector3()), radius: b.getSize(new THREE.Vector3()).length() / 2};
  return ex._frame;
}

function useGear(ex){
  if(gearRoot.userData.ex === ex) return;
  gearRoot.clear(); gearRoot.userData.ex = ex; ex.gear(gearRoot);
}
function paintMuscles(roles){
  for(const p of bodyParts){ const r = p.muscle ? roles[p.muscle] : 0; p.mesh.material = r >= 1 ? M.main : r > 0 ? M.also : M.body; }
}

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function loop(now){
  requestAnimationFrame(loop);
  if(document.hidden || !model) return;
  const t = now / 1000;
  for(const v of views){
    if(!v.visible || !v.canvas.isConnected) continue;
    const ex = EXERCISES[v.key]; if(!ex) continue;
    const r = v.canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if(!w || !h) continue;
    if(v.canvas.width !== w || v.canvas.height !== h){ v.canvas.width = w; v.canvas.height = h; }
    if(renderer.domElement.width < w || renderer.domElement.height < h) renderer.setSize(Math.max(w, renderer.domElement.width), Math.max(h, renderer.domElement.height), false);
    const ph = calm() ? {s: 0, name: "holdC"} : phaseAt(t + v.offset);
    useGear(ex); paintMuscles(ex.roles);
    const J = placeAt(ex, ph.s); ex.place(gearRoot, J);
    // Direction arrow: while lifting, beside the moving bar or hand, pointing where it's going.
    const dt = .05, p0 = ex.track(J), next = placeAt(ex, Math.max(0, ph.s - .04)), p1 = ex.track(next);
    placeAt(ex, ph.s); ex.place(gearRoot, J);
    const dir = p1.sub(p0); arrow.visible = v.arrows && ph.name === "con" && dir.lengthSq() > 1e-8;
    if(arrow.visible){ dir.normalize(); arrow.position.copy(p0).add(new THREE.Vector3(.28, 0, .12)); arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      M.arrow.opacity = Math.sin(Math.PI * Math.min(1, ph.k || 0)) * .95; }
    shadow.position.set(0, .002, ex.anchor === "feet" ? .03 : 0);
    // Camera: three-quarter view, turned by dragging.
    const f = frame(ex), yaw = .62 + v.yaw, dist = f.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (w / h < 1 ? 1.15 : 1);
    camera.aspect = w / h; camera.position.set(f.center.x + Math.sin(yaw) * dist, f.center.y + dist * .28, f.center.z + Math.cos(yaw) * dist);
    camera.lookAt(f.center); camera.updateProjectionMatrix();
    const H = renderer.domElement.height;
    renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
    renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
    const ctx = v.ctx || (v.ctx = v.canvas.getContext("2d"));
    ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, H - h, w, h, 0, 0, w, h);
    if(!v.dragging && v.yaw) v.yaw *= .9;   // eases back to three-quarter view
  }
}

// Shows an exercise in a canvas. Options: rotate (drag to turn), arrows (direction arrow), offset (seconds).
function show(canvas, key, {rotate = false, arrows = true, offset = 0} = {}){
  const v = {canvas, key, yaw: 0, offset, arrows, visible: true, dragging: false};
  views.add(v);
  new IntersectionObserver(es => es.forEach(e => { v.visible = e.isIntersecting; })).observe(canvas);
  if(rotate){
    let x0 = 0, y0 = 0;
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", e => { v.dragging = true; x0 = e.clientX; y0 = v.yaw; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", e => { if(v.dragging) v.yaw = y0 - (e.clientX - x0) / 90; });
    const up = () => { v.dragging = false; };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  }
  return v;
}

export { load, show, EXERCISES, phaseAt, CYCLE };
