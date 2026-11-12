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
  for(const part of ["shoulder","upperarm","forearm","hand","palm","thigh","shin","foot"]){
    const l = P[part]; if(!l) continue;
    const r = P[part + "R"] || [-l[0], l[1], l[2]];
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
  // The floor shadow fades out from the middle.
  const cv = document.createElement("canvas"); cv.width = cv.height = 64;
  const x = cv.getContext("2d"), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "#fff"); gr.addColorStop(.5, "#aaa"); gr.addColorStop(1, "#000"); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  G.soft = new THREE.CanvasTexture(cv);
}
const M = {};   // materials, recolored from the app's color tokens
// The body's muscle maps: four vertex attributes (_ma.._md), four muscles each, in this order (see build-body.py).
// Each vertex says how much of each muscle it sits on (crisp outline, short fade); the shader blends in the main
// muscles' color (red) or the helping muscles' color (yellow), and adds a faint glow so a worked muscle stands
// out even when the figure is small or in shadow.
const MUSCLES = ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Chest", "Back", "Lower back", "Abdominals",
  "Shoulders:front", "Shoulders:side", "Shoulders:rear", "Biceps", "Triceps", "Forearms"];
const MAIN = [0, 1, 2, 3].map(() => new THREE.Vector4()), HELP = [0, 1, 2, 3].map(() => new THREE.Vector4());
function skinMaterial(m){
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, {uMain: {value: MAIN}, uHelp: {value: HELP}, cMain: {value: M.main.color}, cHelp: {value: M.help.color}});
    const sum = u => `clamp(dot(_ma, ${u}[0]) + dot(_mb, ${u}[1]) + dot(_mc, ${u}[2]) + dot(_md, ${u}[3]), 0., 1.)`;
    sh.vertexShader = `attribute vec4 _ma, _mb, _mc, _md;\nuniform vec4 uMain[4], uHelp[4];\nvarying float vMain, vHelp;\n` + sh.vertexShader.replace("#include <begin_vertex>",
      `#include <begin_vertex>\n  vMain = ${sum("uMain")};\n  vHelp = ${sum("uHelp")};`);
    sh.fragmentShader = `uniform vec3 cMain, cHelp;\nvarying float vMain, vHelp;\n` + sh.fragmentShader
      .replace("#include <color_fragment>", `#include <color_fragment>\n  diffuseColor.rgb = mix(mix(diffuseColor.rgb, cHelp, vHelp), cMain, vMain);`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n  totalEmissiveRadiance += cMain * vMain * .3 + cHelp * vHelp * (1. - vMain) * .2;`);
  };
  return m;
}
function mats(){
  if(M.body) return;
  const std = o => new THREE.MeshStandardMaterial({roughness: .62, metalness: 0, ...o});
  Object.assign(M, {body: skinMaterial(std({})), main: std({}), help: std({}), metal: std({metalness: .5, roughness: .35}), plate: std({roughness: .5}),
    pad: std({roughness: .8}), frame: std({metalness: .3, roughness: .45}), arrow: new THREE.MeshBasicMaterial({transparent: true}),
    shadow: new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, opacity: .32, alphaMap: G.soft})});
}
function readColors(){
  const cs = getComputedStyle(document.documentElement), c = v => new THREE.Color().setStyle(cs.getPropertyValue(v).trim() || "#888");
  const surface = c("--surface"), muted = c("--muted"), ink = c("--ink"), red = c("--red"), line = c("--line");
  M.body.color.copy(surface).lerp(muted, .42);
  M.main.color.copy(red); M.help.color.copy(c("--yellow"));
  M.metal.color.copy(muted).lerp(ink, .3); M.plate.color.copy(ink).lerp(muted, .25);
  M.pad.color.copy(line).lerp(ink, .35); M.frame.color.copy(muted);
  M.arrow.color.copy(c("--blue"));
  // The floor shadow uses the app's --shadow token (an rgba color: its alpha sets how dark the shadow is).
  const sh = (cs.getPropertyValue("--shadow").trim().match(/[\d.]+/g) || [0, 0, 0, .3]).map(Number);
  M.shadow.color.setRGB(sh[0] / 255, sh[1] / 255, sh[2] / 255, THREE.SRGBColorSpace); M.shadow.opacity = Math.min(1, (sh[3] ?? .3) * 1.4);
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

// Where a hand holds a bar or handle: the middle of the palm.
const palm = (J, s) => J[`hand_${s}`].clone().lerp(J[`handtip_${s}`], .32);
const at = (J, base, x, y, z) => J[base].clone().add(new THREE.Vector3(x, y, z).applyQuaternion(J.chestQ));

// ---------- exercises for the prototype ----------
// Each: two poses, how the body is placed (feet planted, or the hips at a spot), the muscles worked, the gear,
// and the point the direction arrow follows. Arm, hand and palm directions are relative to the chest
// (x the figure's left, y toward the head, z out of the chest). A barbell lift gives grip(J, s): where the
// bar is, and the arms reach for it, so the hands stay on the bar and the bar stays level with the shoulders.
const EXERCISES = {
  squat: {
    name: "High-bar back squat", roles: {Quadriceps: 1, Glutes: .38}, anchor: "feet",
    // Feet a little wider than the hips, toes turned out; knees track over the toes; chest up; hips to below parallel.
    contracted: {thigh: [.12, -1, 0], shin: [.02, -1, 0], foot: [.34, -.35, 1]},
    stretched: {hips: [0, .86, .5], spine: [0, .8, .6], chest: [0, .82, .57], neck: [0, .92, .38], head: [0, 1, .22],
      thigh: [.25, -.24, 1], shin: [-.09, -.92, -.4], foot: [.34, -.35, 1]},
    // The bar rests on the upper traps; hands just outside the shoulders, elbows down and back.
    grip: J => ({center: at(J, "neck", 0, -.035, -.078), half: .36, hand: [0, .12, -1], palm: [0, 1, .12], pole: [.3, -1, -.6]}),
    gear(g){ g.bar = barbell(); g.add(g.bar); },
    place(g, J){ placeBar(g.bar, J); },
    track: J => J.bar.center.clone(),
  },
  bench: {
    name: "Barbell bench press — flat", roles: {Chest: 1, "Shoulders:front": .38, Triceps: .38}, anchor: {hips: [0, .58, .05]},
    // Shoulders down on the bench with a slight arch, feet flat on the floor behind the knees.
    contracted: {hips: [0, 0, -1], spine: [0, .08, -1], chest: [0, 0, -1], neck: [0, -.12, -1], head: [0, -.05, -1],
      thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1]},
    stretched: {hips: [0, 0, -1], spine: [0, .08, -1], chest: [0, 0, -1], neck: [0, -.12, -1], head: [0, -.05, -1],
      thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1]},
    // From over the shoulders down to the lower chest, a slight diagonal; grip about one and a half shoulder widths;
    // elbows tucked to about 45 degrees, forearms upright.
    grip: (J, s) => ({center: at(J, "chest", 0, .08, .57).lerp(at(J, "chest", 0, -.08, .16), s), half: .34,
      hand: [0, .3, .95], palm: [0, -.95, .3], pole: [1, -.75, -.5]}),
    gear(g){ g.add(box(.3, .06, 1.25, M.pad, 0, .44, -.2)); g.add(box(.06, .42, .06, M.frame, 0, .21, .25)); g.add(box(.06, .42, .06, M.frame, 0, .21, -.7));
      g.bar = barbell(); g.add(g.bar); },
    place(g, J){ placeBar(g.bar, J); },
    track: J => J.bar.center.clone(),
  },
  pulldown: {
    name: "Lat pulldown — wide overhand", roles: {Back: 1, Biceps: .38, "Shoulders:rear": .38}, anchor: {hips: [0, .555, 0]},
    // Thighs under the pad, feet flat; lean back a little, a little more as the bar reaches the upper chest.
    contracted: {hips: [0, .95, -.2], spine: [0, .94, -.34], chest: [0, .94, -.34], neck: [0, 1, -.12], head: [0, 1, 0],
      thigh: [.12, -.05, 1], shin: [0, -1, .1], foot: [.15, -.35, 1]},
    stretched: {hips: [0, .98, -.12], spine: [0, .98, -.18], chest: [0, .98, -.18], neck: [0, 1, -.06], head: [0, 1, 0],
      thigh: [.12, -.05, 1], shin: [0, -1, .1], foot: [.15, -.35, 1]},
    // Arms straight overhead down to the bar touching the top of the chest; elbows drive down and back.
    grip: (J, s) => ({center: at(J, "chest", 0, .03, .16).lerp(at(J, "chest", 0, .6, .06), s), half: .42,
      hand: [0, 1, -.05], palm: [0, 0, 1], pole: [.6, -1, -.6]}),
    gear(g){ g.add(box(.38, .07, .42, M.pad, 0, .43, .12)); g.add(box(.06, .4, .06, M.frame, 0, .2, .12));
      g.add(box(.36, .07, .1, M.pad, 0, .665, .32)); g.add(box(.06, .66, .06, M.frame, 0, .33, .4));
      g.add(box(.08, 2.4, .08, M.frame, 0, 1.2, .66)); g.add(box(.08, .08, .82, M.frame, 0, 2.38, .25));
      g.bar = new THREE.Group(); const b = mesh(G.bar, M.metal); b.scale.set(.9, 1.4, 1.4); g.bar.add(b);
      for(const x of [-1, 1]){ const e = mesh(G.bar, M.metal); e.scale.set(.32, 1.4, 1.4); e.position.set(x * .58, -.04, 0); e.rotation.z = x * -.28; g.bar.add(e); }
      g.add(g.bar); g.cable = mesh(G.cable, M.metal); g.add(g.cable); },
    place(g, J){ placeBar(g.bar, J);
      const top = new THREE.Vector3(0, 2.34, -.08), d = top.clone().sub(J.bar.center);
      g.cable.position.copy(J.bar.center).addScaledVector(d, .5); g.cable.scale.y = d.length(); g.cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); },
    track: J => J.bar.center.clone(),
  },
  lateral: {
    name: "Dumbbell lateral raise", roles: {"Shoulders:side": 1, Back: .38}, anchor: "feet",
    // Soft knees, chest slightly forward. Arms rise a little in front of the body to shoulder height, elbows soft
    // and leading; palms face in at the bottom and down at the top.
    contracted: {hips: [0, 1, .06], spine: [0, 1, .12], chest: [0, 1, .12], neck: [0, 1, .04], head: [0, 1, 0],
      thigh: [.06, -1, .06], shin: [0, -1, -.05],
      upperarm: [1, -.04, .42], forearm: [1, -.12, .6], hand: [1, -.1, .6], palm: [0, -1, 0]},
    stretched: {hips: [0, 1, .06], spine: [0, 1, .12], chest: [0, 1, .12], neck: [0, 1, .04], head: [0, 1, 0],
      thigh: [.06, -1, .06], shin: [0, -1, -.05],
      upperarm: [.16, -1, .14], forearm: [.12, -1, .32], hand: [.08, -1, .3], palm: [-1, 0, .1]},
    gear(g){ g.dl = dumbbell(); g.dr = dumbbell(); g.add(g.dl, g.dr); },
    place(g, J){ for(const [d, s] of [[g.dl, "L"], [g.dr, "R"]]) placeInHand(d, J, s); },
    track: J => palm(J, "L"),
  },
};
const _x = new THREE.Vector3(1, 0, 0), X_TO_THUMB = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
// A barbell lies along the line between the hands.
function placeBar(bar, J){ bar.position.copy(J.bar.center); bar.quaternion.setFromUnitVectors(_x, J.bar.axis); }
// A dumbbell's handle runs across the palm (the way the thumb points in the model's rest pose).
function placeInHand(d, J, s){
  const q = J[`handQ_${s}`];
  d.quaternion.copy(q).multiply(X_TO_THUMB);
  d.position.copy(palm(J, s)).addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(q), .012);
}

// ---------- the shared renderer ----------
let renderer, scene, camera, model, bones = {}, rest = {}, gearRoot, arrow, shadow, ready = null;
const views = new Set();
async function load(url){
  if(ready) return ready;
  ready = (async () => {
    geo(); mats(); readColors();
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
    renderer.setPixelRatio(1); renderer.setSize(720, 720, false); renderer.setScissorTest(true);
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
    rest.feet = bones.foot_L.getWorldPosition(new THREE.Vector3());
    rest.wqInv = {}; for(const [b] of AIM) rest.wqInv[b] = bones[b].getWorldQuaternion(new THREE.Quaternion()).invert();
    const gap = (a, b) => bones[a].getWorldPosition(new THREE.Vector3()).distanceTo(bones[b].getWorldPosition(new THREE.Vector3()));
    // Fingers close around a bar by turning each joint about the hand's width (in the rest pose the hands are
    // palm down along +X / -X, so that's -Z for the left hand and +Z for the right, in three.js).
    rest.fingers = [];
    for(const s of ["L", "R"]) for(let f = 1; f <= 5; f++) for(let j = 1; j <= 3; j++){
      const b = bones[`f${f}${j}_${s}`]; if(!b) continue;
      const axis = new THREE.Vector3(0, 0, s === "L" ? -1 : 1).applyQuaternion(b.getWorldQuaternion(new THREE.Quaternion()).invert());
      rest.fingers.push({b, q: b.quaternion.clone(), axis, ang: THREE.MathUtils.degToRad(f === 1 ? [8, 18, 18][j - 1] : [42, 55, 38][j - 1])});
    }
    rest.len = {upperarm: gap("upperarm_L", "forearm_L"), forearm: gap("forearm_L", "hand_L"), hand: gap("hand_L", "handtip_L")};
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
const _d = new THREE.Quaternion(), _t = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3(), _x2 = new THREE.Vector3();
// Turning the palm: the upper arm takes half the turn, the forearm and hand the rest, like a real arm.
const TWIST = {upperarm: .5, forearm: 1, hand: 1};
const DOWN = new THREE.Vector3(0, -1, 0);   // the palms face down in the model's rest pose
// Only this bone is updated here; children update when read (getWorld* walks up) and all at once at the end.
function setWorld(bone, wq){ bone.parent.getWorldQuaternion(_p); bone.quaternion.copy(_p.invert().multiply(wq)); bone.updateWorldMatrix(false, false); }
function twist(bone, axis, target, share){
  bone.getWorldQuaternion(_w);
  _c.copy(DOWN).applyQuaternion(_q.copy(_w).multiply(rest.wqInv[bone.name]));   // the way the palm faces now
  _c.addScaledVector(axis, -_c.dot(axis)); _n.copy(target).addScaledVector(axis, -target.dot(axis));
  if(_c.lengthSq() < 1e-6 || _n.lengthSq() < 1e-6) return;
  _c.normalize(); _n.normalize();
  const ang = Math.atan2(_x2.crossVectors(_c, _n).dot(axis), _c.dot(_n)) * share;
  setWorld(bone, _q.setFromAxisAngle(axis, ang).multiply(_w));
}
const _f = new THREE.Quaternion();
function pose(dirs){
  for(const [b] of AIM) bones[b].quaternion.copy(rest[b]);
  for(const f of rest.fingers) f.b.quaternion.copy(f.q).multiply(_f.setFromAxisAngle(f.axis, f.ang * (dirs.grip ?? 1)));
  model.position.set(0, 0, 0); model.updateMatrixWorld(true);
  for(const [b, c] of AIM){
    const bone = bones[b]; let t = dirs[b]; if(!t) continue;
    // Arms are written relative to the chest (y toward the head, z out of the chest), so they lean with the torso.
    if(ARM.test(b)){ bones.chest.getWorldQuaternion(_d).multiply(rest.chestWorldInv); t = _t.copy(t).applyQuaternion(_d); }
    bone.getWorldPosition(_a); bones[c].getWorldPosition(_b);
    _q.setFromUnitVectors(_b.sub(_a).normalize(), t);
    setWorld(bone, bone.getWorldQuaternion(_w).premultiply(_q));
    const [part, side] = b.split("_"), pv = dirs[`palm_${side}`];
    if(TWIST[part] && pv) twist(bone, t, pv.clone().applyQuaternion(_d), TWIST[part]);
  }
}
const JOINTS = ["hips","chest","neck","head","headtop","upperarm_L","upperarm_R","hand_L","hand_R","handtip_L","handtip_R","foot_L","foot_R","toe_L","toe_R","forearm_L","forearm_R","shin_L","shin_R"];
function joints(){ const J = {}; for(const n of JOINTS) J[n] = bones[n].getWorldPosition(new THREE.Vector3());
  J.chestQ = bones.chest.getWorldQuaternion(new THREE.Quaternion()).multiply(rest.chestWorldInv);
  for(const s of ["L", "R"]) J[`handQ_${s}`] = bones[`hand_${s}`].getWorldQuaternion(new THREE.Quaternion()).multiply(rest.wqInv[`hand_${s}`]);
  return J; }
const mirror = (v, s) => new THREE.Vector3(s === "L" ? v[0] : -v[0], v[1], v[2]).normalize();
// Two-joint reach: the elbow that puts the wrist at w from the shoulder at a, bending toward pole.
function elbow(a, w, l1, l2, pole){
  const d = w.clone().sub(a), len = THREE.MathUtils.clamp(d.length(), Math.abs(l1 - l2) + 1e-3, (l1 + l2) * .999);
  d.normalize();
  const x = (l1 * l1 - l2 * l2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const up = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
  return a.clone().addScaledVector(d, x).addScaledVector(up, h);
}
// Interpolated pose for an exercise at stretch s (0 contracted .. 1 stretched); places the body and returns its joints.
function placeAt(ex, s){
  const A = ex._c || (ex._c = expand(ex.contracted)), B = ex._s || (ex._s = expand(ex.stretched)), d = {};
  for(const k in A) if(B[k]) d[k] = A[k].clone().lerp(B[k], s).normalize();
  pose(d);
  if(ex.anchor === "feet"){ const f = bones.foot_L.getWorldPosition(new THREE.Vector3()), g = bones.foot_R.getWorldPosition(new THREE.Vector3());
    model.position.copy(rest.feet).sub(f.add(g).multiplyScalar(.5)); model.position.x = 0; }
  else { const h = bones.hips.getWorldPosition(new THREE.Vector3()); model.position.set(...ex.anchor.hips).sub(h); }
  model.updateMatrixWorld(true);
  if(!ex.grip) return joints();
  // Barbell lifts: the arms reach for the bar.
  let J = joints();
  const g = ex.grip(J, s), axis = new THREE.Vector3(1, 0, 0).applyQuaternion(J.chestQ), inv = J.chestQ.clone().invert(), at0 = model.position.clone();
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
  J = joints(); J.bar = {center: g.center, axis: palm(J, "L").sub(palm(J, "R")).normalize()};
  return J;
}
// Camera framing per exercise, from the joints at both ends of the movement.
function frame(ex){
  if(ex._frame) return ex._frame;
  const b = new THREE.Box3();
  for(const s of [0, 1]){ const J = placeAt(ex, s); for(const k in J) if(J[k].isVector3) b.expandByPoint(J[k]); }
  b.expandByPoint(new THREE.Vector3(0, 0, 0));
  ex._frame = {center: b.getCenter(new THREE.Vector3()), radius: b.getSize(new THREE.Vector3()).length() / 2};
  return ex._frame;
}

function useGear(ex){
  if(gearRoot.userData.ex === ex) return;
  gearRoot.clear(); gearRoot.userData.ex = ex; ex.gear(gearRoot);
}
// Main muscles in red, helping muscles in yellow.
function paintMuscles(roles){
  MUSCLES.forEach((m, i) => { const r = roles[m] || 0;
    MAIN[i >> 2].setComponent(i & 3, r >= 1 ? 1 : 0); HELP[i >> 2].setComponent(i & 3, r > 0 && r < 1 ? 1 : 0); });
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
    const ph = v.still != null ? {s: v.still, name: "holdC"} : calm() ? {s: 0, name: "holdC"} : phaseAt(t + v.offset);
    useGear(ex); paintMuscles(ex.roles);
    // Direction arrow: while lifting, beside the moving bar or hand, pointing where it's going (a moment ahead).
    const ahead = v.arrows && ph.name === "con" ? ex.track(placeAt(ex, Math.max(0, ph.s - .04))) : null;
    const J = placeAt(ex, ph.s); ex.place(gearRoot, J);
    const p0 = ex.track(J), dir = ahead ? ahead.sub(p0) : new THREE.Vector3(); arrow.visible = !!ahead && dir.lengthSq() > 1e-8;
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
