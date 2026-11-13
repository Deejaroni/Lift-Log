// Lift Log: 3D exercise figures. One shared three.js renderer draws every figure on screen (phones allow only a
// few WebGL views), each into its own 2D canvas. A movement is key poses (js/poses3d.js), each written as the
// direction each body part points, played at one tempo. Loaded on demand by js/visuals.js; see docs/DECISIONS.md.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { POSES } from "./poses3d.js";
import { gearFor, holdOf, buildGear } from "./gear3d.js";

// ---------- tempo: 2 s lowering, a short pause, 1 s lifting, a short pause ----------
const TEMPO = [["ecc", 2.0], ["holdS", 0.4], ["con", 1.0], ["holdC", 0.4]];
const CYCLE = TEMPO.reduce((a, p) => a + p[1], 0);
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
// 0 = contracted, 1 = stretched, and the phase, at time t (seconds). Loops just go round; step sequences
// (a get-up) play out and back more slowly.
function phaseAt(t, P){
  if(P.loop) return {s: ((t / (P.loop === true ? 1.6 : P.loop)) % 1 + 1) % 1, name: "loop"};
  if(P.steps && !P.loop){ const u = ((t / (P.period || 8)) % 1 + 1) % 1; return {s: u < .5 ? ease(u * 2) : ease(2 - u * 2), name: "steps"}; }
  let x = ((t % CYCLE) + CYCLE) % CYCLE;
  for(const [name, d] of TEMPO){ if(x < d){ const k = x / d;
    return name === "ecc" ? {s: ease(k), name} : name === "con" ? {s: 1 - ease(k), name, k} : {s: name === "holdS" ? 1 : 0, name}; } x -= d; }
  return {s: 0, name: "holdC"};
}

// ---------- the bones a pose can aim, in order, with the child that gives each one's direction ----------
const AIM = [["hips","spine"],["spine","chest"],["chest","neck"],["neck","head"],["head","headtop"]];
for(const s of ["L","R"]) AIM.push([`shoulder_${s}`,`upperarm_${s}`],[`upperarm_${s}`,`forearm_${s}`],[`forearm_${s}`,`hand_${s}`],[`hand_${s}`,`handtip_${s}`],
  [`thigh_${s}`,`shin_${s}`],[`shin_${s}`,`foot_${s}`],[`foot_${s}`,`toe_${s}`]);

// Pose shorthand: arms and legs are given for the left side; the right mirrors it (x flipped) unless given
// (as upperarmR and so on). Arms, hands and palms are relative to the chest; the rest to the world (+Z forward).
const STAND = {hips:[0,1,0], spine:[0,1,0], chest:[0,1,0], neck:[0,1,0], head:[0,1,0], shoulder:[1,0,0],
  upperarm:[.12,-1,0], forearm:[.08,-1,.05], hand:[0,-1,.05], palm:[-1,0,.1], thigh:[.06,-1,0], shin:[0,-1,-.02], foot:[.12,-.35,1]};
const PARTS = ["shoulder","upperarm","forearm","hand","palm","thigh","shin","foot"];
function expand(p){
  const o = {}, P = {...STAND, ...p};
  for(const k of ["hips","spine","chest","neck","head"]) o[k] = new THREE.Vector3(...P[k]).normalize();
  for(const part of PARTS){
    const l = P[part]; if(!l) continue;
    const r = P[part + "R"] || [-l[0], l[1], l[2]];
    o[`${part}_L`] = new THREE.Vector3(...l).normalize(); o[`${part}_R`] = new THREE.Vector3(...r).normalize();
  }
  o.roll = P.roll || 0; o.twist = P.twist || 0; o.grip = P.grip ?? 1;
  return o;
}
function mix(A, B, s){
  const d = {};
  for(const k in A){ const a = A[k], b = B[k]; d[k] = a && a.isVector3 ? (b ? a.clone().lerp(b, s).normalize() : a) : a + ((b ?? a) - a) * s; }
  return d;
}

// ---------- materials, recolored from the app's color tokens ----------
// The body's muscle map: one vertex attribute, _mw = (muscle, weight, muscle, weight), each vertex's two strongest
// muscles as indexes into this list (see tools/model/build-body.py). The shader blends in red for the main muscles
// and yellow for the helpers by how much of each sits under the vertex, with a faint glow so they read when small.
const MUSCLES = ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Chest", "Back", "Lower back", "Abdominals",
  "Shoulders:front", "Shoulders:side", "Shoulders:rear", "Biceps", "Triceps", "Forearms"];
const MAIN = new Float32Array(16), HELP = new Float32Array(16);
const M = {};
function skinMaterial(m){
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {uMain: {value: MAIN}, uHelp: {value: HELP}, cMain: {value: M.main.color}, cHelp: {value: M.help.color}});
    sh.vertexShader = `attribute vec4 _mw;\nuniform float uMain[16];\nuniform float uHelp[16];\nvarying float vMain, vHelp;\n` + sh.vertexShader.replace("#include <begin_vertex>",
      `#include <begin_vertex>\n  int a = int(_mw.x + .5), b = int(_mw.z + .5);\n  vMain = clamp(uMain[a] * _mw.y + uMain[b] * _mw.w, 0., 1.);\n  vHelp = clamp(uHelp[a] * _mw.y + uHelp[b] * _mw.w, 0., 1.);`);
    sh.fragmentShader = `uniform vec3 cMain, cHelp;\nvarying float vMain, vHelp;\n` + sh.fragmentShader
      .replace("#include <color_fragment>", `#include <color_fragment>\n  diffuseColor.rgb = mix(mix(diffuseColor.rgb, cHelp, vHelp), cMain, vMain);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n  totalEmissiveRadiance += cMain * vMain * .3 + cHelp * vHelp * (1. - vMain) * .2;`);
  };
  return m;
}
function mats(soft){
  const std = o => new THREE.MeshStandardMaterial({roughness: .62, metalness: 0, ...o});
  Object.assign(M, {main: std({}), help: std({}), metal: std({metalness: .5, roughness: .35}), plate: std({roughness: .5}),
    pad: std({roughness: .8}), frame: std({metalness: .3, roughness: .45}), arrow: new THREE.MeshBasicMaterial({transparent: true}),
    shadow: new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, alphaMap: soft})});
  M.body = skinMaterial(std({}));
}
function readColors(){
  const cs = getComputedStyle(document.documentElement), c = v => new THREE.Color().setStyle(cs.getPropertyValue(v).trim() || "#888");
  const surface = c("--surface"), muted = c("--muted"), ink = c("--ink"), line = c("--line");
  // The body is a mid grey between the surface and the muted text color (a little darker on a light background).
  M.body.color.copy(surface).lerp(muted, surface.getHSL({}).l > .5 ? .55 : .42);
  M.main.color.copy(c("--red")); M.help.color.copy(c("--yellow"));
  M.metal.color.copy(muted).lerp(ink, .3); M.plate.color.copy(ink).lerp(muted, .25);
  M.pad.color.copy(line).lerp(ink, .35); M.frame.color.copy(muted);
  M.arrow.color.copy(c("--blue"));
  // The floor shadow uses the --shadow token (an rgba color: its alpha sets how dark the shadow is).
  const sh = (cs.getPropertyValue("--shadow").trim().match(/[\d.]+/g) || [0, 0, 0, .3]).map(Number);
  M.shadow.color.setRGB(sh[0] / 255, sh[1] / 255, sh[2] / 255, THREE.SRGBColorSpace); M.shadow.opacity = Math.min(1, (sh[3] ?? .3) * 1.4);
  for(const v of views) v.dirty = true;
}

// ---------- the shared renderer ----------
let renderer, scene, camera, model, bones = {}, rest = {}, gearRoot, arrow, shadow, ready = null;
const views = new Map();   // canvas -> view
function softDisc(){
  const cv = document.createElement("canvas"); cv.width = cv.height = 64;
  const x = cv.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "#fff"); gr.addColorStop(.5, "#aaa"); gr.addColorStop(1, "#000"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
function load(url){
  if(ready) return ready;
  ready = (async () => {
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
    renderer.setPixelRatio(1); renderer.setSize(640, 640, false); renderer.setScissorTest(true);
    mats(softDisc());
    scene = new THREE.Scene();
    // Soft studio light: sky and floor fill, a key from the upper front right, a weaker fill from the left, a rim behind.
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.9); key.position.set(2.2, 3.5, 3.5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, .55); fill.position.set(-3, 1.5, 2); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1); rim.position.set(-2, 3, -3.5); scene.add(rim);
    camera = new THREE.PerspectiveCamera(30, 1, .05, 50);
    const gltf = await new GLTFLoader().loadAsync(url);
    model = gltf.scene; scene.add(model);
    model.traverse(o => {
      if(o.isBone) bones[o.name] = o;
      if(o.isMesh){ o.frustumCulled = false; o.material = M.body; }
    });
    for(const [b] of AIM) rest[b] = bones[b].quaternion.clone();
    model.updateMatrixWorld(true);
    rest.chestWorldInv = bones.chest.getWorldQuaternion(new THREE.Quaternion()).invert();
    rest.wqInv = {}; for(const [b] of AIM) rest.wqInv[b] = bones[b].getWorldQuaternion(new THREE.Quaternion()).invert();
    const gap = (a, b) => bones[a].getWorldPosition(new THREE.Vector3()).distanceTo(bones[b].getWorldPosition(new THREE.Vector3()));
    rest.len = {upperarm: gap("upperarm_L", "forearm_L"), forearm: gap("forearm_L", "hand_L"), hand: gap("hand_L", "handtip_L")};
    // Fingers close around a bar by turning each joint about the hand's width (in the rest pose the hands are
    // palm down along +X / -X, so that's -Z for the left hand and +Z for the right).
    rest.fingers = [];
    for(const s of ["L", "R"]) for(let f = 1; f <= 5; f++) for(let j = 1; j <= 3; j++){
      const b = bones[`f${f}${j}_${s}`]; if(!b) continue;
      const axis = new THREE.Vector3(0, 0, s === "L" ? -1 : 1).applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()).invert());
      rest.fingers.push({b, q: b.quaternion.clone(), axis, ang: THREE.MathUtils.degToRad(f === 1 ? [8, 18, 18][j - 1] : [42, 55, 38][j - 1])});
    }
    gearRoot = new THREE.Group(); scene.add(gearRoot);
    arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .16, 12), M.arrow); shaft.position.y = .08;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.04, .08, 18), M.arrow); cone.position.y = .2;
    arrow.add(shaft, cone); scene.add(arrow);
    shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), M.shadow); scene.add(shadow);
    readColors();
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);
    new MutationObserver(readColors).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
    requestAnimationFrame(loop);
  })();
  return ready;
}

// ---------- posing ----------
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _w = new THREE.Quaternion(), _p = new THREE.Quaternion();
const _d = new THREE.Quaternion(), _t = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3(), _x2 = new THREE.Vector3(), _f = new THREE.Quaternion();
const ARM = /^(shoulder|upperarm|forearm|hand)_/;
// Turning the palm: the upper arm takes half the turn, the forearm and hand the rest, like a real arm.
const TWIST = {upperarm: .5, forearm: 1, hand: 1};
const DOWN = new THREE.Vector3(0, -1, 0), FRONT = new THREE.Vector3(0, 0, 1);
// Only this bone is updated here; children update when read (getWorld* walks up) and all at once at the end.
function setWorld(bone, wq){ bone.parent.getWorldQuaternion(_p); bone.quaternion.copy(_p.invert().multiply(wq)); bone.updateWorldMatrix(false, false); }
// Turn a bone about its own axis so `ref` (a direction in the rest pose) points as near `target` as it can.
function turnTo(bone, axis, ref, target, share){
  bone.getWorldQuaternion(_w);
  _c.copy(ref).applyQuaternion(_q.copy(_w).multiply(rest.wqInv[bone.name]));
  _c.addScaledVector(axis, -_c.dot(axis)); _n.copy(target).addScaledVector(axis, -target.dot(axis));
  if(_c.lengthSq() < 1e-6 || _n.lengthSq() < 1e-6) return;
  _c.normalize(); _n.normalize();
  setWorld(bone, _q.setFromAxisAngle(axis, Math.atan2(_x2.crossVectors(_c, _n).dot(axis), _c.dot(_n)) * share).multiply(_w));
}
function spin(bone, axis, deg){ if(!deg) return; bone.getWorldQuaternion(_w); setWorld(bone, _q.setFromAxisAngle(axis, THREE.MathUtils.degToRad(deg)).multiply(_w)); }
function pose(d){
  for(const [b] of AIM) bones[b].quaternion.copy(rest[b]);
  for(const f of rest.fingers) f.b.quaternion.copy(f.q).multiply(_f.setFromAxisAngle(f.axis, f.ang * d.grip));
  model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  for(const [b, c] of AIM){
    const bone = bones[b]; let t = d[b]; if(!t) continue;
    if(ARM.test(b)){ bones.chest.getWorldQuaternion(_d).multiply(rest.chestWorldInv); t = _t.copy(t).applyQuaternion(_d); }
    bone.getWorldPosition(_a); bones[c].getWorldPosition(_b);
    _q.setFromUnitVectors(_b.sub(_a).normalize(), t);
    setWorld(bone, bone.getWorldQuaternion(_w).premultiply(_q));
    // roll turns the whole body about the hips (lying face down is roll 180); twist turns the chest.
    if(b === "hips") spin(bone, t, d.roll);
    if(b === "chest") spin(bone, t, d.twist);
    const [part, side] = b.split("_"), pv = d[`palm_${side}`];
    if(TWIST[part] && pv) turnTo(bone, t, DOWN, pv.clone().applyQuaternion(_d), TWIST[part]);
  }
}
const JOINTS = ["hips","spine","chest","neck","head","headtop","upperarm_L","upperarm_R","forearm_L","forearm_R","hand_L","hand_R","handtip_L","handtip_R",
  "thigh_L","thigh_R","shin_L","shin_R","foot_L","foot_R","toe_L","toe_R"];
function joints(){ const J = {}; for(const n of JOINTS) J[n] = bones[n].getWorldPosition(new THREE.Vector3());
  J.chestQ = bones.chest.getWorldQuaternion(new THREE.Quaternion()).multiply(rest.chestWorldInv);
  J.hipsQ = bones.hips.getWorldQuaternion(new THREE.Quaternion()).multiply(rest.wqInv.hips);
  for(const s of ["L", "R"]) J[`handQ_${s}`] = bones[`hand_${s}`].getWorldQuaternion(new THREE.Quaternion()).multiply(rest.wqInv[`hand_${s}`]);
  return J; }
// How far each joint sits inside the skin, for putting the body on the floor.
const SKIN = {toe: .02, foot: .07, shin: .055, thigh: .09, hips: .1, spine: .1, chest: .1, head: .1, headtop: .02, hand: .035, handtip: .015, forearm: .04, upperarm: .05};
const mirror = (v, s) => new THREE.Vector3(s === "L" ? v[0] : -v[0], v[1], v[2]).normalize();
// Two-joint reach: the elbow that puts the wrist at w from the shoulder at a, bending toward pole.
function elbow(a, w, l1, l2, pole){
  const d = w.clone().sub(a), len = THREE.MathUtils.clamp(d.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * .999);
  d.normalize();
  const x = (l1 * l1 - l2 * l2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const up = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
  return a.clone().addScaledVector(d, x).addScaledVector(up, h);
}
const palm = (J, s) => J[`hand_${s}`].clone().lerp(J[`handtip_${s}`], .32);
// The pose dictionaries for a pattern (expanded once).
function keyPoses(P){
  if(P._k) return P._k;
  return (P._k = (P.steps || [P.c, P.s]).map(expand));
}
// The pose at stretch s: between two key poses, or along a sequence (loops come back to the first).
function at(P, s){
  const K = keyPoses(P);
  if(K.length === 2 && !P.loop) return mix(K[0], K[1], s);
  const n = P.loop ? K.length : K.length - 1, x = Math.min(s, .9999) * n, i = Math.floor(x);
  return mix(K[i % K.length], K[(i + 1) % K.length], P.loop ? x - i : ease(x - i));
}
// The pattern to use for a kind of weight (a dumbbell fly lies on a bench; a cable fly stands).
const resolve = (key, kind) => { const P = POSES[key]; return P && P.kinds && P.kinds[kind] ? POSES[P.kinds[kind]] : P; };
// Places the body for pattern P at stretch s and returns its joints.
function placeAt(P, s, kind){
  const d = at(P, s);
  pose(d);
  anchor(P);
  if(!P.grip) return joints();
  // Barbell lifts with a set bar path: the arms reach for the bar.
  let J = joints();
  const g = P.grip(J, s, kind); if(!g) return J;
  const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(J.chestQ), inv = J.chestQ.clone().invert(), at0 = model.position.clone();
  for(const side of ["L", "R"]){
    const grip = g.center.clone().addScaledVector(axis, side === "L" ? g.half : -g.half);
    const hand = mirror(g.hand, side).applyQuaternion(J.chestQ), pole = mirror(g.pole, side).applyQuaternion(J.chestQ);
    const wrist = grip.addScaledVector(hand, -.32 * rest.len.hand), a = J[`upperarm_${side}`];
    const e = elbow(a, wrist, rest.len.upperarm, rest.len.forearm, pole);
    d[`upperarm_${side}`] = e.clone().sub(a).normalize().applyQuaternion(inv);
    d[`forearm_${side}`] = wrist.clone().sub(e).normalize().applyQuaternion(inv);
    d[`hand_${side}`] = mirror(g.hand, side); d[`palm_${side}`] = mirror(g.palm, side);
  }
  pose(d); model.position.copy(at0); model.updateMatrixWorld(true);
  return joints();
}
// Keeps one joint (the feet by default; "foot_L" for one side) at a set spot; "floor" puts the lowest part of the
// body (or of the joints named in floorBy) on the ground.
function anchor(P){
  const A = P.at || {fix: "foot", pos: [0, "floor", 0]}, two = !A.fix.includes("_") && !["hips", "spine", "chest", "head", "neck"].includes(A.fix);
  const f = two ? bones[`${A.fix}_L`].getWorldPosition(new THREE.Vector3()).add(bones[`${A.fix}_R`].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5)
    : bones[A.fix].getWorldPosition(new THREE.Vector3());
  model.position.set(A.pos[0] - f.x, 0, A.pos[2] - f.z);
  if(A.pos[1] === "floor"){
    let low = Infinity;
    for(const n of JOINTS){ const k = n.split("_")[0]; if(SKIN[k] == null || (A.floorBy && !A.floorBy.includes(k))) continue; low = Math.min(low, bones[n].getWorldPosition(_a).y - SKIN[k]); }
    model.position.y = -low;
  } else model.position.y = A.pos[1] - f.y;
  model.updateMatrixWorld(true);
}
// Camera framing per pattern, from the joints (and the equipment, for big views) over the movement.
function frame(P, kind, tight){
  const id = `${kind}|${tight ? 1 : 0}`; P._frame = P._frame || {};
  if(P._frame[id]) return P._frame[id];
  const b = new THREE.Box3(), g = gearFor(gearRoot, P, kind, M);
  for(const s of [0, .25, .5, .75, 1]){
    const J = placeAt(P, s, kind); for(const k in J) if(J[k].isVector3) b.expandByPoint(J[k]);
    if(!tight){ g.userData.place(J, s); g.updateMatrixWorld(true); const gb = new THREE.Box3().setFromObject(g, true); if(!gb.isEmpty()) b.union(gb); }
  }
  b.expandByScalar(tight ? .08 : .05);
  if(!tight) b.expandByPoint(new THREE.Vector3(b.getCenter(_a).x, 0, b.getCenter(_a).z));
  return (P._frame[id] = {center: b.getCenter(new THREE.Vector3()), radius: b.getSize(new THREE.Vector3()).length() / 2, floor: Math.max(.3, Math.hypot(b.max.x - b.min.x, b.max.z - b.min.z) * .4)});
}
// Main muscles in red, helping muscles in yellow.
function paintMuscles(roles){
  MUSCLES.forEach((m, i) => { const r = roles[m] || 0; MAIN[i] = r >= 1 ? 1 : 0; HELP[i] = r > 0 && r < 1 ? 1 : 0; });
}

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const _arrowOff = new THREE.Vector3(.26, 0, .1), _up = new THREE.Vector3(0, 1, 0);
function draw(v, now){
  const r = v.canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if(!w || !h) return;
  if(v.canvas.width !== w || v.canvas.height !== h){ v.canvas.width = w; v.canvas.height = h; }
  if(renderer.domElement.width < w || renderer.domElement.height < h) renderer.setSize(Math.max(w, renderer.domElement.width), Math.max(h, renderer.domElement.height), false);
  const P = resolve(v.key, v.kind), still = v.still || calm();
  const ph = still ? {s: v.stillAt ?? (P.loop ? 0 : P.stillAt ?? 1), name: "still"} : phaseAt(now / 1000 + v.offset, P);
  const g = gearFor(gearRoot, P, v.kind, M);
  for(const c of gearRoot.children) c.visible = c === g;
  paintMuscles(v.roles);
  // Framing first: working it out poses the body at several points, so the real pose has to come after.
  const f = frame(P, v.kind, v.tight);
  // Direction arrow: while lifting, beside the moving weight, pointing where it's going (a moment ahead).
  const track = P.track || g.userData.track;
  const ahead = v.arrows && ph.name === "con" && track ? track(placeAt(P, Math.max(0, ph.s - .04), v.kind)) : null;
  const J = placeAt(P, ph.s, v.kind); g.userData.place(J, ph.s);
  const p0 = ahead ? track(J) : null, dir = ahead ? ahead.sub(p0) : null;
  arrow.visible = !!dir && dir.lengthSq() > 1e-8;
  if(arrow.visible){ dir.normalize(); arrow.position.copy(p0).add(_arrowOff); arrow.quaternion.setFromUnitVectors(_up, dir);
    M.arrow.opacity = Math.sin(Math.PI * Math.min(1, ph.k || 0)) * .95; }
  // Camera: three-quarter view (or the pattern's own angle), turned by dragging.
  shadow.position.set(f.center.x, .002, f.center.z); shadow.scale.setScalar(f.floor);
  const yaw = (P.yaw ?? .62) + v.yaw, dist = f.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * (w / h < 1 ? 1.15 : 1) * (v.tight ? .82 : 1);
  camera.aspect = w / h; camera.position.set(f.center.x + Math.sin(yaw) * dist, f.center.y + dist * (P.lift ?? .28), f.center.z + Math.cos(yaw) * dist);
  camera.lookAt(f.center); camera.updateProjectionMatrix();
  const H = renderer.domElement.height;
  renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
  renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  const ctx = v.ctx || (v.ctx = v.canvas.getContext("2d"));
  ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, H - h, w, h, 0, 0, w, h);
  v.canvas.dataset.drawn = String((+v.canvas.dataset.drawn || 0) + 1);
  if(still) v.canvas.dataset.still = "1"; else delete v.canvas.dataset.still;
  v.dirty = false; v.last = now;
}
// Each frame gets a time budget, so a slow phone (or a computer without a graphics chip) stays responsive:
// the big picture draws first, then the small ones take turns, stopping once the budget is used.
// After drawing, the page stays idle at least as long as the drawing took, so the figures never take more
// than half the time.
const BUDGET = 10;   // ms per frame
let turn = 0, idleUntil = 0;
function loop(now){
  requestAnimationFrame(loop);
  if(document.hidden || !model || performance.now() < idleUntil) return;
  const due = [];
  for(const [canvas, v] of views){
    if(!canvas.isConnected){ views.delete(canvas); continue; }
    if(!v.visible || !canvas.getClientRects().length) continue;
    const still = v.still || calm();
    if(still && !v.dirty) continue;
    // Small pictures move at about 30 frames a second; the big one at the screen's rate.
    if(!still && v.small && now - (v.last || 0) < 30) continue;
    due.push(v);
  }
  if(!due.length) return;
  const big = due.filter(v => !v.small), small = due.filter(v => v.small), start = performance.now();
  const order = [...big, ...small.slice(turn % small.length), ...small.slice(0, turn % small.length)];
  let n = 0;
  for(const v of order){
    if(n && performance.now() - start > (globalThis.__fig3dBudget ?? BUDGET)) break;   // the review page lifts the budget
    if(v.yaw && !v.dragging && !(v.still || calm())) v.yaw *= .9;   // eases back to the three-quarter view
    draw(v, now); n++;
  }
  turn += Math.max(1, n - big.length);
  const end = performance.now(); idleUntil = globalThis.__fig3dBudget ? 0 : end + (end - start);
}

// Shows a pattern in a canvas. spec: {key, kind, roles}. Options: rotate (drag to turn), arrows, offset (s),
// tight (crop to the body, for small pictures), still (hold the end position).
function show(canvas, spec, {rotate = false, arrows = false, offset = 0, tight = false, still = false} = {}){
  if(!POSES[spec.key]) return null;
  let v = views.get(canvas);
  if(v){ Object.assign(v, spec, {arrows, offset, tight, still, dirty: true}); return v; }
  v = {canvas, ...spec, yaw: 0, offset, arrows, tight, still, visible: true, dragging: false, dirty: true};
  v.small = canvas.getBoundingClientRect().width < 120;
  views.set(canvas, v);
  new IntersectionObserver(es => es.forEach(e => { v.visible = e.isIntersecting; if(v.visible) v.dirty = true; })).observe(canvas);
  if(rotate){
    let x0 = 0, y0 = 0;
    canvas.style.touchAction = "pan-y";
    canvas.addEventListener("pointerdown", e => { v.dragging = true; x0 = e.clientX; y0 = v.yaw; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener("pointermove", e => { if(v.dragging){ v.yaw = y0 - (e.clientX - x0) / 90; v.dirty = true; } });
    const up = () => { v.dragging = false; };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  }
  return v;
}
const release = canvas => views.delete(canvas);
// For tests: every joint of a pattern at stretch s with a kind of weight, as plain numbers.
function check(key, kind, s){ const P = resolve(key, kind), J = placeAt(P, s, kind), g = gearFor(gearRoot, P, kind, M); g.userData.place(J, s);
  return Object.fromEntries(Object.entries(J).filter(([, v]) => v.isVector3).map(([k, v]) => [k, v.toArray()])); }

export { load, show, release, check, phaseAt, CYCLE, POSES, MUSCLES, palm, holdOf, buildGear };
