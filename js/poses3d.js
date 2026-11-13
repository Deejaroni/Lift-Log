// Lift Log: 3D key poses for every movement pattern in js/movements.js (same keys). Each pattern gives c (the
// contracted end) and s (the stretched end), or steps (a sequence; loop: true to go round). Body parts are given
// as directions: the torso, head and legs in the world (+Y up, +Z the way the figure faces, +X its left), and the
// arms, hands and palms relative to the chest (+Y toward the head, +Z out of the chest). Left limbs mirror to the
// right unless a part is given as thighR and so on. Also: at (which joint stays put, and where), hold (what the
// hands hold), grip (a bar path the hands follow), props and move (benches and machines), cable (the pulley).
import * as THREE from "three";
import { morePoses } from "./poses3d-more.js";
import { variantPoses } from "./poses3d-variants.js";

const R = Math.PI / 180;
// A direction tilted forward from straight up (up) or straight down (dn) by a degrees; x leans it sideways.
export const up = (a, x = 0) => [x, Math.cos(a * R), Math.sin(a * R)];
export const dn = (a, x = 0) => [x, -Math.cos(a * R), Math.sin(a * R)];
// A world direction in the frame of a chest leaning forward by a degrees (for arms that hang or reach).
export const inC = (v, a) => [v[0], v[1] * Math.cos(a * R) + v[2] * Math.sin(a * R), -v[1] * Math.sin(a * R) + v[2] * Math.cos(a * R)];
// The torso leaning forward by a degrees (negative leans back), the head a little less.
export const torso = (a, head = .6) => ({hips: up(a * .85), spine: up(a), chest: up(a), neck: up(a * (head + .2)), head: up(a * head)});
// Lying on the back with the head toward -Z; face down is the same with roll 180.
export const SUPINE = {hips: [0, 0, -1], spine: [0, 0, -1], chest: [0, 0, -1], neck: [0, .05, -1], head: [0, .05, -1]};
export const PRONE = {...SUPINE, neck: [0, -.05, -1], head: [0, -.1, -1], roll: 180};
// Sitting: thighs forward, shins down, feet flat.
export const SEATED = {thigh: [.12, -.04, 1], shin: [0, -1, .05], foot: [.1, -.35, 1]};
// A point offset from a joint in the chest's frame (x left, y toward the head, z out of the chest).
export const at = (J, base, x, y, z) => J[base].clone().add(new THREE.Vector3(x, y, z).applyQuaternion(J.chestQ));
// A bar path between two chest-frame points (c at the contracted end, s at the stretched end), with the hands'
// grip: half (half the hand spacing), hand and palm directions, and pole (which way the elbows bend).
export const path = (base, c, s, half, hand, palm, pole) => (J, t) =>
  ({center: at(J, base, ...c).lerp(at(J, base, ...s), t), half, hand, palm, pole});
// A bar resting on the upper back, the hands just outside the shoulders (squats, lunges, good mornings).
export const BACK_BAR = (J, s, kind) => kind === "barbell" ? {center: at(J, "neck", 0, -.035, -.078), half: .36, hand: [0, .12, -1], palm: [0, 1, .12], pole: [.3, -1, -.6]} : null;
const BACK_HOLD = {barbell: "bar", dumbbell: "each", kettlebell: "each", default: ""};
// A flat bench along Z, its top at y, from z0 to z1.
export const bench = (B, y = .44, z0 = -.85, z1 = .42, w = .3) => {
  B.box(w, .06, z1 - z0, 0, y - .03, (z0 + z1) / 2, B.M.pad);
  B.box(.06, y - .06, .06, 0, (y - .06) / 2, z1 - .15); B.box(.06, y - .06, .06, 0, (y - .06) / 2, z0 + .15);
};
// A seat with a back rest for machines, hips over (0, y, 0).
export const seat = (B, y = .48, back = true) => {
  B.box(.42, .08, .46, 0, y - .14, .08, B.M.pad); B.box(.06, y - .18, .06, 0, (y - .18) / 2, .05);
  if(back) B.box(.42, .62, .08, 0, y + .2, -.16, B.M.pad);
};
const arrowAt = n => J => J[`${n}_L`] ? J[`${n}_L`].clone() : J[n].clone();
const midOf = n => J => J[`${n}_L`].clone().add(J[`${n}_R`]).multiplyScalar(.5);

const SQUAT_DOWN = {...torso(36), hips: [0, .86, .5], thigh: [.25, -.24, 1], shin: [-.09, -.92, -.4], foot: [.34, -.35, 1]};
const STANCE = {thigh: [.12, -1, 0], shin: [.02, -1, 0], foot: [.34, -.35, 1]};

export const POSES = {
  // ---------- legs ----------
  squat: {c: STANCE, s: SQUAT_DOWN, grip: BACK_BAR, hold: BACK_HOLD},
  gobletSquat: {hold: "one",
    c: {...STANCE, upperarm: [.18, -.85, .5], forearm: [-.5, .55, .65], hand: [-.45, .75, .45], palm: [-.6, .5, -.3]},
    s: {...SQUAT_DOWN, ...torso(22), hips: [0, .9, .42], upperarm: [.18, -.85, .5], forearm: [-.5, .55, .65], hand: [-.45, .75, .45], palm: [-.6, .5, -.3]}},
  bwSquat: {hold: "",
    c: {...STANCE, upperarm: [.06, -.05, 1], forearm: [.03, 0, 1], hand: [0, 0, 1], palm: [0, -1, 0], grip: .25},
    s: {...SQUAT_DOWN, upperarm: inC([.06, .05, 1], 36), forearm: inC([.03, .05, 1], 36), hand: inC([0, .05, 1], 36), palm: inC([0, -1, 0], 36), grip: .25}},
  legPress: {hold: "", at: {fix: "hips", pos: [0, .52, 0]}, yaw: 1.1,
    c: {...torso(-48, .45), thigh: [.14, .38, .92], shin: [.04, .34, .94], foot: [.1, .95, -.3], upperarm: [.3, -1, -.1], forearm: [.05, -.4, .9], grip: .9},
    s: {...torso(-48, .45), thigh: [.2, .88, .45], shin: [.02, -.25, .97], foot: [.1, .95, -.3], upperarm: [.3, -1, -.1], forearm: [.05, -.4, .9], grip: .9},
    props(B){ B.box(.46, .08, .5, 0, .37, .02, B.M.pad); B.box(.46, .07, .7, 0, .7, -.32, B.M.pad, Math.PI / 4);
      B.box(.08, .36, .08, 0, .18, 0); B.rod([0, .1, .1], [0, 1.25, 1.6], .03);
      return {sled: B.box(.55, .5, .05, 0, 1, 1, B.M.frame)}; },
    move(o, J){ const f = J.foot_L.clone().add(J.foot_R).multiplyScalar(.5).add(J.toe_L.clone().add(J.toe_R).multiplyScalar(.5)).multiplyScalar(.5);
      o.sled.position.copy(f).add(new THREE.Vector3(0, .02, .06)); o.sled.rotation.x = -.35; },
    track: J => J.foot_L.clone()},
  legExt: {hold: "", at: {fix: "hips", pos: [0, .55, 0]},
    c: {...torso(-6), ...SEATED, shin: [0, .12, 1], foot: [.1, .9, .4], upperarm: [.25, -1, -.05], forearm: [0, -.5, .85], grip: .9},
    s: {...torso(-6), ...SEATED, shin: [0, -1, .12], foot: [.1, -.3, 1], upperarm: [.25, -1, -.05], forearm: [0, -.5, .85], grip: .9},
    props(B){ seat(B, .55); return {pad: B.rod([-.22, 0, 0], [.22, 0, 0], .045, B.M.pad)}; },
    move(o, J){ const f = J.foot_L.clone().add(J.foot_R).multiplyScalar(.5), k = J.shin_L.clone().add(J.shin_R).multiplyScalar(.5), d = f.clone().sub(k).normalize();
      o.pad.position.copy(f).addScaledVector(d, -.06).add(new THREE.Vector3(0, d.z, -d.y).multiplyScalar(.06)); o.pad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)); },
    track: J => J.foot_L.clone()},
  lunge: {grip: BACK_BAR, hold: BACK_HOLD, at: {fix: "foot_L", pos: [.1, "floor", .3]},
    c: {thigh: [.08, -.98, .18], shin: [0, -1, -.15], thighR: [-.08, -.95, -.3], shinR: [0, -.97, -.25], footR: [-.1, -.85, .5]},
    s: {...torso(6), thigh: [.08, -.05, 1], shin: [0, -1, -.02], thighR: [-.06, -1, -.15], shinR: [0, -.22, -1], footR: [-.05, -.95, .3]}},
  hinge: {at: {fix: "foot", pos: [0, "floor", 0]},
    c: {...STANCE, thigh: [.1, -1, .04], upperarm: [.12, -1, .05], forearm: [.06, -1, .05], palm: [0, 0, -1]},
    s: {...torso(74, .55), thigh: [.1, -.95, .3], shin: [0, -1, -.06], upperarm: inC([.12, -1, 0], 74), forearm: inC([.06, -1, 0], 74), hand: inC([0, -1, 0], 74), palm: inC([0, 0, -1], 74)}},
  goodMorning: {grip: BACK_BAR, hold: {barbell: "bar", default: ""},
    c: {...STANCE, thigh: [.1, -1, .04], upperarm: [.4, -.5, -.6], forearm: [-.4, .8, -.2], grip: .4},
    s: {...torso(80, .5), thigh: [.1, -.96, .28], shin: [0, -1, -.05], upperarm: [.4, -.5, -.6], forearm: [-.4, .8, -.2], grip: .4}},
  backExt: {hold: "", at: {fix: "thigh", pos: [0, .95, 0]}, yaw: 1.2,
    c: {hips: [0, .7, .7], spine: [0, .7, .7], chest: [0, .7, .7], neck: [0, .75, .65], head: [0, .8, .6], thigh: [.08, -.7, -.7], shin: [0, -.7, -.72], foot: [.1, -.75, .6],
      upperarm: [.3, -.6, .7], forearm: [-.85, .45, .3], hand: [-.8, .5, .3], grip: .3},
    s: {hips: [0, .3, .95], spine: [0, -.35, .94], chest: [0, -.7, .7], neck: [0, -.8, .6], head: [0, -.85, .5], thigh: [.08, -.7, -.7], shin: [0, -.7, -.72], foot: [.1, -.75, .6],
      upperarm: [.3, -.6, .7], forearm: [-.85, .45, .3], hand: [-.8, .5, .3], grip: .3},
    props(B){ B.box(.4, .08, .3, 0, .86, .1, B.M.pad, -Math.PI / 4); B.rod([-.18, .42, -.55], [.18, .42, -.55], .04, B.M.pad); B.rod([0, .1, -.6], [0, .86, .05], .03); B.box(.5, .04, .9, 0, .02, -.3); },
    track: J => J.head.clone()},
  legCurlLying: {hold: "", at: {fix: "hips", pos: [0, .74, 0]}, yaw: 1.25,
    c: {...PRONE, thigh: [.06, -.05, 1], shin: [0, .9, -.3], foot: [.08, .5, .9], upperarm: [.25, .65, .7], forearm: [.05, .3, .95], hand: [0, 0, 1], grip: .9},
    s: {...PRONE, thigh: [.06, -.05, 1], shin: [0, -.1, 1], foot: [.08, -.9, .4], upperarm: [.25, .65, .7], forearm: [.05, .3, .95], hand: [0, 0, 1], grip: .9},
    props(B){ bench(B, .64, -.9, .45, .32); return {pad: B.rod([-.2, 0, 0], [.2, 0, 0], .045, B.M.pad)}; },
    move(o, J){ const f = J.foot_L.clone().add(J.foot_R).multiplyScalar(.5), k = J.shin_L.clone().add(J.shin_R).multiplyScalar(.5), d = f.clone().sub(k).normalize();
      o.pad.position.copy(f).addScaledVector(d, -.06).add(new THREE.Vector3(0, -d.z, d.y).multiplyScalar(.065)); },
    track: J => J.foot_L.clone()},
  legCurlSeated: {hold: "", at: {fix: "hips", pos: [0, .55, 0]},
    c: {...torso(-6), ...SEATED, shin: [0, -.9, -.45], foot: [.1, -.6, .8], upperarm: [.25, -1, -.05], forearm: [0, -.5, .85], grip: .9},
    s: {...torso(-6), ...SEATED, shin: [0, -.05, 1], foot: [.1, .8, .5], upperarm: [.25, -1, -.05], forearm: [0, -.5, .85], grip: .9},
    props(B){ seat(B, .55); B.rod([-.22, .7, .3], [.22, .7, .3], .04, B.M.pad); return {pad: B.rod([-.22, 0, 0], [.22, 0, 0], .045, B.M.pad)}; },
    move(o, J){ const f = J.foot_L.clone().add(J.foot_R).multiplyScalar(.5), k = J.shin_L.clone().add(J.shin_R).multiplyScalar(.5), d = f.clone().sub(k).normalize();
      o.pad.position.copy(f).addScaledVector(d, -.06).add(new THREE.Vector3(0, -d.z, d.y).multiplyScalar(.065)); o.pad.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)); },
    track: J => J.foot_L.clone()},
  hipThrust: {at: {fix: "chest", pos: [0, .5, -.32]}, hold: {barbell: "bar", default: ""}, yaw: 1.15,
    grip: (J, s, kind) => kind === "barbell" ? {center: J.hips.clone().add(new THREE.Vector3(0, .13, .05)), half: .38, hand: [0, -.2, 1], palm: [0, 1, .2], pole: [.6, .2, -1]} : null,
    c: {hips: [0, .05, -1], spine: [0, .1, -1], chest: [0, .12, -1], neck: [0, .5, -.85], head: [0, .45, -.9], thigh: [.16, .02, 1], shin: [0, -1, .05], foot: [.1, -.35, 1],
      upperarm: [.4, -.5, .6], forearm: [-.2, -.8, .5], grip: .6},
    s: {hips: [0, .5, -.85], spine: [0, .5, -.85], chest: [0, .45, -.9], neck: [0, .6, -.8], head: [0, .5, -.85], thigh: [.16, .42, .9], shin: [0, -.98, -.18], foot: [.1, -.35, 1],
      upperarm: [.4, -.5, .6], forearm: [-.2, -.8, .5], grip: .6},
    props(B){ B.box(1.1, .4, .32, 0, .2, -.48, B.M.pad); },
    track: J => J.hips.clone()},
  calfRaise: {grip: BACK_BAR, hold: BACK_HOLD, at: {fix: "toe", pos: [0, .13, .08]},
    c: {thigh: [.1, -1, 0], shin: [0, -1, .02], foot: [.1, -.85, .55]},
    s: {thigh: [.1, -1, 0], shin: [0, -1, .02], foot: [.1, .25, 1]},
    props(B){ B.box(.6, .11, .28, 0, .055, .02, B.M.pad); },
    track: J => J.head.clone()},

  // ---------- chest and shoulders ----------
  benchPress: {at: {fix: "hips", pos: [0, .58, .05]}, yaw: .95,
    c: {...SUPINE, spine: [0, .08, -1], neck: [0, -.12, -1], head: [0, -.05, -1], thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1]},
    s: {...SUPINE, spine: [0, .08, -1], neck: [0, -.12, -1], head: [0, -.05, -1], thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1]},
    grip: path("chest", [0, .08, .57], [0, -.08, .16], .34, [0, .3, .95], [0, -.95, .3], [1, -.75, -.5]),
    props(B){ bench(B); B.rod([-.55, 0, -.55], [-.55, 1.05, -.55], .025); B.rod([.55, 0, -.55], [.55, 1.05, -.55], .025); }},
  inclinePress: {at: {fix: "hips", pos: [0, .56, .05]}, yaw: .95,
    c: {hips: [0, .5, -.86], spine: [0, .6, -.8], chest: [0, .6, -.8], neck: [0, .7, -.7], head: [0, .75, -.65], ...SEATED, thigh: [.25, -.05, 1], shin: [0, -1, .1]},
    s: {hips: [0, .5, -.86], spine: [0, .6, -.8], chest: [0, .6, -.8], neck: [0, .7, -.7], head: [0, .75, -.65], ...SEATED, thigh: [.25, -.05, 1], shin: [0, -1, .1]},
    grip: path("chest", [0, .2, .55], [0, .08, .16], .33, [0, .3, .95], [0, -.95, .3], [1, -.75, -.5]),
    props(B){ B.box(.32, .06, .5, 0, .44, .1, B.M.pad); B.box(.32, .06, .9, 0, .75, -.42, B.M.pad, -Math.PI / 5.5); B.box(.06, .42, .06, 0, .21, .1); B.box(.06, .5, .06, 0, .25, -.6); }},
  chestPress: {at: {fix: "hips", pos: [0, .55, 0]}, hold: "each", implement: "cable",
    c: {...torso(-8), ...SEATED}, s: {...torso(-8), ...SEATED},
    grip: path("chest", [0, .02, .6], [0, .02, .17], .24, [0, .1, 1], [-.2, -1, 0], [1, -.6, -.4]),
    props(B){ seat(B, .55); B.box(.08, 1.4, .08, -.5, .7, -.25); B.box(.08, 1.4, .08, .5, .7, -.25); B.box(1.08, .08, .08, 0, 1.42, -.25); }},
  cablePress: {hold: "each", implement: "cable", cable: {L: [.6, 1.3, -.55], R: [-.6, 1.3, -.55]}, at: {fix: "foot", pos: [0, "floor", 0]},
    c: {...torso(12), thigh: [.08, -.98, .2], shin: [0, -1, -.1], thighR: [-.08, -.97, -.25], shinR: [0, -.97, -.2], footR: [-.1, -.8, .55]},
    s: {...torso(12), thigh: [.08, -.98, .2], shin: [0, -1, -.1], thighR: [-.08, -.97, -.25], shinR: [0, -.97, -.2], footR: [-.1, -.8, .55]},
    grip: path("chest", [0, .02, .58], [0, .03, .18], .2, [0, .1, 1], [-1, 0, 0], [1, -.8, -.3])},
  fly: {kinds: {dumbbell: "flyBench", cable: "flyCable", kettlebell: "flyBench"}, hold: "each", implement: "cable", at: {fix: "hips", pos: [0, .55, 0]},
    c: {...torso(-6), ...SEATED, upperarm: [.32, -.05, .95], forearm: [-.3, .02, .95], hand: [-.2, .05, 1], palm: [-1, 0, .1]},
    s: {...torso(-6), ...SEATED, upperarm: [1, -.05, .05], forearm: [.95, 0, .3], hand: [.9, 0, .4], palm: [-.2, 0, 1]},
    props(B){ seat(B, .55); B.box(.08, 1.6, .08, 0, .8, -.3); B.box(1.1, .08, .08, 0, 1.6, -.3); }},
  flyBench: {hold: "each", at: {fix: "hips", pos: [0, .58, .05]}, yaw: .9,
    c: {...SUPINE, thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1], upperarm: [.22, 0, 1], forearm: [-.16, 0, 1], hand: [-.1, 0, 1], palm: [-1, 0, 0]},
    s: {...SUPINE, thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1], upperarm: [1, 0, -.12], forearm: [.95, 0, .3], hand: [.9, 0, .4], palm: [0, 0, 1]},
    props(B){ bench(B); }},
  flyCable: {hold: "each", implement: "cable", cable: {L: [.95, 1.95, -.1], R: [-.95, 1.95, -.1]},
    c: {...torso(14), thigh: [.08, -.98, .2], shin: [0, -1, -.1], thighR: [-.08, -.97, -.25], shinR: [0, -.97, -.2], footR: [-.1, -.8, .55],
      upperarm: [.3, -.35, .9], forearm: [-.25, -.3, .95], hand: [-.2, -.3, .95], palm: [-1, 0, 0]},
    s: {...torso(14), thigh: [.08, -.98, .2], shin: [0, -1, -.1], thighR: [-.08, -.97, -.25], shinR: [0, -.97, -.2], footR: [-.1, -.8, .55],
      upperarm: [1, .15, -.1], forearm: [.9, .2, .3], hand: [.85, .2, .4], palm: [0, -.2, 1]}},
  pushUp: {hold: "", at: {fix: "hand", pos: [0, .035, 0]}, yaw: 1.2,
    c: {...PRONE, hips: [0, .36, -.93], spine: [0, .36, -.93], chest: [0, .36, -.93], neck: [0, .3, -.95], head: [0, .2, -.98], thigh: [.05, -.36, .93], shin: [0, -.36, .93], foot: [.05, -.95, .3],
      upperarm: [.22, -.12, 1], forearm: [.18, -.08, 1], hand: [.1, 1, .05], palm: [0, 0, 1], grip: 0},
    s: {...PRONE, hips: [0, .1, -1], spine: [0, .1, -1], chest: [0, .1, -1], neck: [0, .1, -1], head: [0, .1, -1], thigh: [.05, -.12, 1], shin: [0, -.1, 1], foot: [.05, -.95, .3],
      upperarm: [.6, -.5, -.6], forearm: [.05, -.25, 1], hand: [.1, 1, .05], palm: [0, 0, 1], grip: 0},
    track: J => J.chest.clone()},
  dips: {hold: "", at: {fix: "hand", pos: [0, 1.25, 0]}, yaw: 1,
    c: {...torso(4), thigh: [.05, -.95, .2], shin: [0, -.6, -.8], upperarm: [.15, -1, -.08], forearm: [.1, -1, 0], hand: [0, -.4, .9], palm: [-.6, -.8, 0]},
    s: {...torso(22), thigh: [.05, -.95, .25], shin: [0, -.6, -.8], upperarm: [.2, -.15, -1], forearm: [.05, -1, .1], hand: [0, -.4, .9], palm: [-.6, -.8, 0]},
    props(B){ for(const x of [-.24, .24]){ B.rod([x, 1.24, -.35], [x, 1.24, .35], .02); B.rod([x, 0, -.3], [x, 1.24, -.3], .025); B.rod([x, 0, .3], [x, 1.24, .3], .025); } },
    track: J => J.chest.clone()},
  ohp: {c: {upperarm: [.22, 1, .05], forearm: [.1, 1, 0], hand: [0, 1, -.05]}, s: {},
    grip: path("chest", [0, .78, .03], [0, .21, .16], .3, [0, .85, -.5], [0, .5, .85], [.4, -1, .5])},
  lateralRaise: {hold: {default: "each"},
    c: {...torso(6), thigh: [.06, -1, .06], shin: [0, -1, -.05], upperarm: [1, -.04, .42], forearm: [1, -.12, .6], hand: [1, -.1, .6], palm: [0, -1, 0]},
    s: {...torso(6), thigh: [.06, -1, .06], shin: [0, -1, -.05], upperarm: [.16, -1, .14], forearm: [.12, -1, .32], hand: [.08, -1, .3], palm: [-1, 0, .1]}},
  frontRaise: {hold: {barbell: "bar", none: "", default: "each"},
    c: {upperarm: [.12, -.02, 1], forearm: [.08, .02, 1], hand: [0, 0, 1], palm: [0, -1, 0]},
    s: {upperarm: [.12, -1, .14], forearm: [.06, -1, .16], hand: [0, -1, .12], palm: [0, 0, -1]}},
  reverseFly: {hold: {barbell: "", default: "each"}, implement: "dumbbell",
    c: {...torso(58), thigh: [.1, -.97, .22], shin: [0, -1, -.06], upperarm: inC([1, -.12, 0], 58), forearm: inC([1, -.25, .1], 58), hand: inC([1, -.25, .1], 58), palm: inC([0, -1, 0], 58)},
    s: {...torso(58), thigh: [.1, -.97, .22], shin: [0, -1, -.06], upperarm: inC([.18, -1, .15], 58), forearm: inC([.1, -1, .2], 58), hand: inC([0, -1, .15], 58), palm: inC([-1, 0, 0], 58)}},
  facePull: {hold: "each", implement: "cable", cable: [0, 1.62, 1.35],
    c: {...torso(-6), upperarm: [1, .18, -.12], forearm: [-.25, .6, .75], hand: [-.3, .7, .5], palm: [-1, 0, .2]},
    s: {...torso(-4), upperarm: [.18, .12, 1], forearm: [.06, .12, 1], hand: [0, .1, 1], palm: [-1, 0, 0]}},

  // ---------- back ----------
  pulldown: {hold: "bar", implement: "lat", cable: [0, 2.34, -.08], at: {fix: "hips", pos: [0, .555, 0]}, yaw: .75,
    c: {hips: [0, .95, -.2], spine: [0, .94, -.34], chest: [0, .94, -.34], neck: [0, 1, -.12], head: [0, 1, 0], thigh: [.12, -.05, 1], shin: [0, -1, .1], foot: [.15, -.35, 1]},
    s: {hips: [0, .98, -.12], spine: [0, .98, -.18], chest: [0, .98, -.18], neck: [0, 1, -.06], head: [0, 1, 0], thigh: [.12, -.05, 1], shin: [0, -1, .1], foot: [.15, -.35, 1]},
    grip: path("chest", [0, .03, .16], [0, .6, .06], .42, [0, 1, -.05], [0, 0, 1], [.6, -1, -.6]),
    props(B){ B.box(.38, .07, .42, 0, .43, .12, B.M.pad); B.box(.06, .4, .06, 0, .2, .12);
      B.box(.36, .07, .1, 0, .665, .32, B.M.pad); B.box(.06, .66, .06, 0, .33, .4);
      B.box(.08, 2.4, .08, 0, 1.2, .66); B.box(.08, .08, .82, 0, 2.38, .25); }},
  pullUp: {hold: "", at: {fix: "hand", pos: [0, 2.12, 0]}, yaw: .5,
    c: {...torso(-8), thigh: [.06, -.95, .3], shin: [0, -.75, -.65], upperarm: [.8, -.55, -.15], forearm: [-.12, 1, -.05], hand: [0, 1, 0], palm: [0, 0, 1]},
    s: {...torso(-2), thigh: [.06, -.97, .2], shin: [0, -.8, -.6], upperarm: [.3, 1, .02], forearm: [.1, 1, 0], hand: [0, 1, 0], palm: [0, 0, 1]},
    props(B){ B.rod([-.75, 2.14, 0], [.75, 2.14, 0], .018, B.M.metal); B.rod([-.72, 0, 0], [-.72, 2.14, 0], .03); B.rod([.72, 0, 0], [.72, 2.14, 0], .03); },
    track: J => J.head.clone()},
  cableRow: {hold: "one", implement: "cable", cable: [0, .42, 1.35], at: {fix: "hips", pos: [0, .5, 0]}, yaw: 1.15,
    c: {...torso(-6), thigh: [.14, .12, 1], shin: [0, -.1, 1], foot: [.1, .95, .3], upperarm: [.18, -.6, -.75], forearm: [-.2, .05, 1], hand: [-.2, 0, 1], palm: [-1, 0, 0]},
    s: {...torso(18), thigh: [.14, .12, 1], shin: [0, -.1, 1], foot: [.1, .95, .3], upperarm: inC([.08, -.1, 1], 18), forearm: inC([-.06, -.1, 1], 18), hand: inC([-.05, -.1, 1], 18), palm: [-1, 0, 0]},
    props(B){ B.box(.36, .08, 1.3, 0, .38, .35, B.M.pad); B.box(.06, .34, .06, 0, .17, .35); B.box(.45, .3, .05, 0, .3, 1.02); B.box(.1, 1.2, .1, 0, .6, 1.4); }},
  bentRow: {
    c: {...torso(58), thigh: [.1, -.97, .24], shin: [0, -1, -.06], upperarm: inC([.25, -.55, -.75], 58), forearm: inC([.05, -1, .05], 58), hand: inC([0, -1, .1], 58), palm: inC([0, 0, -1], 58)},
    s: {...torso(58), thigh: [.1, -.97, .24], shin: [0, -1, -.06], upperarm: inC([.14, -1, .1], 58), forearm: inC([.06, -1, .08], 58), hand: inC([0, -1, .08], 58), palm: inC([0, 0, -1], 58)}},
  straightArm: {hold: "bar", implement: "cable", cable: [0, 2.05, 1.05],
    c: {...torso(22), thigh: [.08, -.98, .12], upperarm: inC([.12, -.98, .2], 22), forearm: inC([.1, -.98, .25], 22), hand: inC([0, -1, .2], 22), palm: inC([0, -.3, -1], 22)},
    s: {...torso(22), thigh: [.08, -.98, .12], upperarm: inC([.12, .55, .85], 22), forearm: inC([.1, .55, .85], 22), hand: inC([0, .55, .85], 22), palm: inC([0, -1, .4], 22)}},
  pullover: {hold: {barbell: "bar", default: "one"}, at: {fix: "hips", pos: [0, .58, .05]}, yaw: .95,
    c: {...SUPINE, thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1], upperarm: [.18, .05, 1], forearm: [-.1, .2, 1], hand: [-.1, .3, .95], palm: [-.7, .7, 0]},
    s: {...SUPINE, thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1], upperarm: [.18, .95, -.25], forearm: [-.1, .9, -.35], hand: [-.1, .9, -.3], palm: [-.7, -.2, .7]},
    props(B){ bench(B); }},
  shrug: {
    c: {shoulder: [1, .35, 0], upperarm: [.1, -1, .02], forearm: [.06, -1, .04]},
    s: {shoulder: [1, -.06, 0], upperarm: [.1, -1, .02], forearm: [.06, -1, .04]},
    track: J => J.neck.clone()},

  // ---------- arms ----------
  // Curls and lying extensions use a shorter (EZ-length) bar.
  curl: {hold: {cable: "bar", none: "", default: null}, barLen: 1.3,
    c: {upperarm: [.1, -1, -.06], forearm: [.06, .55, .83], hand: [0, .75, .6], palm: [0, .83, -.55]},
    s: {upperarm: [.1, -1, -.02], forearm: [.06, -1, .12], hand: [0, -1, .12], palm: [0, 0, 1]}},
  pushdown: {hold: {default: "bar"}, implement: "cable", cable: [0, 1.95, .48],
    c: {...torso(10), upperarm: inC([.1, -1, -.1], 10), forearm: inC([.05, -1, .1], 10), hand: inC([0, -1, .1], 10), palm: inC([0, 0, -1], 10)},
    s: {...torso(10), upperarm: inC([.1, -1, -.1], 10), forearm: inC([.05, .3, .95], 10), hand: inC([0, .2, 1], 10), palm: inC([0, -1, 0], 10)}},
  overheadExt: {hold: {barbell: "bar", default: "one"},
    c: {upperarm: [.12, 1, .06], forearm: [-.08, 1, 0], hand: [-.1, 1, 0], palm: [-.7, 0, .7]},
    s: {upperarm: [.12, 1, .06], forearm: [-.12, -.55, -.83], hand: [-.1, -.6, -.8], palm: [-.7, 0, .7]}},
  skullCrusher: {barLen: 1.3, at: {fix: "hips", pos: [0, .58, .05]}, yaw: .95,
    c: {...SUPINE, thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1], upperarm: [.16, .28, .95], forearm: [.02, .28, .96], hand: [0, .28, .96], palm: [0, -.96, .28]},
    s: {...SUPINE, thigh: [.3, -.2, 1], shin: [0, -.93, -.36], foot: [.2, -.3, 1], upperarm: [.16, .28, .95], forearm: [-.02, .95, -.3], hand: [0, .95, -.25], palm: [0, .3, 1]},
    props(B){ bench(B); }},

  // ---------- core ----------
  crunch: {hold: "", at: {fix: "hips", pos: [0, "floor", 0]}, yaw: 1.2,
    c: {...SUPINE, spine: [0, .35, -.94], chest: [0, .62, -.78], neck: [0, .7, -.7], head: [0, .65, -.75], thigh: [.12, .72, .68], shin: [0, -.72, .68], foot: [.1, -.25, 1],
      upperarm: [.85, .5, -.1], forearm: [-.55, .6, .1], hand: [-.5, .6, .1], grip: .3},
    s: {...SUPINE, thigh: [.12, .72, .68], shin: [0, -.72, .68], foot: [.1, -.25, 1], upperarm: [.85, .5, -.1], forearm: [-.55, .6, .1], hand: [-.5, .6, .1], grip: .3},
    track: J => J.head.clone()},
  legRaise: {hold: "", at: {fix: "hand", pos: [0, 2.12, 0]}, yaw: .9,
    c: {thigh: [.08, .45, .9], shin: [0, -.85, .45], foot: [.1, -.5, .8], upperarm: [.3, 1, .02], forearm: [.1, 1, 0], hand: [0, 1, 0], palm: [0, 0, 1]},
    s: {thigh: [.08, -1, .04], shin: [0, -1, 0], foot: [.1, -.7, .6], upperarm: [.3, 1, .02], forearm: [.1, 1, 0], hand: [0, 1, 0], palm: [0, 0, 1]},
    props(B){ B.rod([-.75, 2.14, 0], [.75, 2.14, 0], .018, B.M.metal); B.rod([-.72, 0, 0], [-.72, 2.14, 0], .03); B.rod([.72, 0, 0], [.72, 2.14, 0], .03); },
    track: J => J.shin_L.clone()},
  plank: {hold: "", at: {fix: "toe", pos: [0, "floor", .7]}, yaw: 1.25, stillAt: 0,
    c: {...PRONE, hips: [0, .2, -.98], spine: [0, .2, -.98], chest: [0, .2, -.98], neck: [0, .2, -.98], head: [0, .15, -.99], thigh: [.05, -.2, .98], shin: [0, -.2, .98], foot: [.05, -.95, .3],
      upperarm: [.12, -.05, 1], forearm: [-.05, 1, -.05], hand: [-.1, 1, 0], palm: [0, 0, 1], grip: .3},
    s: {...PRONE, hips: [0, .21, -.98], spine: [0, .21, -.98], chest: [0, .21, -.98], neck: [0, .2, -.98], head: [0, .15, -.99], thigh: [.05, -.21, .98], shin: [0, -.21, .98], foot: [.05, -.95, .3],
      upperarm: [.12, -.05, 1], forearm: [-.05, 1, -.05], hand: [-.1, 1, 0], palm: [0, 0, 1], grip: .3}},
};
// The rest of the patterns live in poses3d-more.js, built with the same helpers.
const KIT = {THREE, up, dn, inC, torso, SUPINE, PRONE, SEATED, at, path, BACK_BAR, bench, seat, STANCE, SQUAT_DOWN};
Object.assign(POSES, morePoses(KIT));
// Seated, chest-supported, machine, kneeling and other versions (picked by name in js/variants3d.js).
Object.assign(POSES, variantPoses(KIT, POSES));
