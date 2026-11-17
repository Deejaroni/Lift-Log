// Lift Log: 3D poses for movements that differ from their family's picture (found in a review of every exercise's
// picture, 2026-11-17): one-leg squats, the Pallof press, scaption, hammer and reverse curls, rope attachments, the
// Arnold press and one-leg bridges. Added to POSES in poses3d.js, which passes in its helpers and the base
// patterns; js/variants3d.js picks them by name. Same conventions as poses3d.js.
export function fixPoses(K, P){
  const {inC, torso, path, at} = K;
  const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const ARMS_FWD = {upperarm: [.06, -.05, 1], forearm: [.03, 0, 1], hand: [0, 0, 1], palm: [0, -1, 0], grip: .25};
  const fwd = lean => ({upperarm: inC([.06, .05, 1], lean), forearm: inC([.03, .05, 1], lean), hand: inC([0, .05, 1], lean), palm: inC([0, -1, 0], lean), grip: .25});
  // The standing leg folded deep (pistol and shrimp squats), its foot flat.
  const DEEP = {thigh: [.08, -.3, .95], shin: [-.03, -.77, -.64], foot: [.3, -.35, 1]};
  const ONE_LEG_AT = {fix: "foot_L", pos: [.1, "floor", 0]};

  return {
    // ---------- one-leg and knee-forward squats ----------
    // Pistol: the free leg reaches straight forward as you sit down on the other.
    pistol: {hold: "", at: ONE_LEG_AT, yaw: 1.05,
      c: {thigh: [.08, -1, .04], shin: [0, -1, -.02], thighR: [-.08, -.6, .8], shinR: [0, -.85, .52], footR: [-.1, -.35, 1], ...ARMS_FWD},
      s: {...torso(40, .5), hips: [0, .8, .6], ...DEEP, thighR: [-.08, .06, 1], shinR: [0, .1, 1], footR: [-.08, .6, .8], ...fwd(40)}},
    // Shrimp: the back knee bends and comes down behind you, toward the floor.
    shrimpSquat: {hold: "", at: ONE_LEG_AT, yaw: 1.05,
      c: {thigh: [.08, -1, .04], shin: [0, -1, -.02], thighR: [-.06, -.95, -.3], shinR: [0, .3, -.95], footR: [-.06, -.2, -1], ...ARMS_FWD},
      s: {...torso(35, .5), hips: [0, .82, .55], ...DEEP, thighR: [-.06, -.85, -.5], shinR: [0, .35, -.94], footR: [-.06, -.2, -1], ...fwd(35)}},
    // Sissy squat: up on the toes, knees travel far forward, one straight line from the knees to the head.
    sissySquat: {hold: "", at: {fix: "toe", pos: [0, "floor", 0]}, yaw: 1.1,
      c: {thigh: [.1, -1, .02], shin: [0, -1, -.02], foot: [.1, -.85, .5], ...ARMS_FWD},
      s: {...torso(-25, .3), thigh: [.1, -.9, .42], shin: [0, -.55, -.83], foot: [.1, -.85, .5], ...fwd(-25)}},

    // ---------- core ----------
    // Pallof press: the cable pulls from the side; the hands press straight out from the chest and back, no twist.
    pallof: {hold: "one", implement: "cable", cable: [-1.1, 1.2, .05], yaw: .5,
      c: {thigh: [.14, -1, 0], shin: [0, -1, -.02]}, s: {thigh: [.14, -1, 0], shin: [0, -1, -.02]},
      grip: path("chest", [0, .06, .56], [0, .04, .14], .035, [0, 0, 1], [-1, 0, 0], [.5, -1, 0])},

    // ---------- shoulders ----------
    // Scaption: arms rise to shoulder height about 30 degrees forward of straight out, thumbs up.
    scaption: {hold: {default: "each"}, implement: "dumbbell",
      c: {...torso(4), upperarm: [.87, -.02, .5], forearm: [.87, -.04, .5], hand: [.87, -.04, .5], palm: [-.5, 0, .87]},
      s: {...torso(4), upperarm: [.16, -1, .14], forearm: [.12, -1, .2], hand: [.08, -1, .2], palm: [-1, 0, .1]}},
    // Arnold press: palms face you with the dumbbells in front of the face, and turn forward as you press up.
    arnold: {...P.ohp, hold: {default: "each"}, implement: "dumbbell",
      grip: (J, s) => ({center: at(J, "chest", 0, .78, .03).lerp(at(J, "chest", 0, .2, .2), s), half: .3 + (.1 - .3) * s,
        hand: lerp([0, .85, -.5], [0, .95, .3], s), palm: lerp([0, .5, .85], [-.2, .2, -1], s), pole: lerp([.4, -1, .5], [0, -1, .7], s)})},

    // ---------- arms ----------
    // Hammer curl: thumbs up the whole way, palms facing each other.
    curlHammer: {...P.curl, hold: {cable: "bar", none: "", default: null},
      c: {...P.curl.c, palm: [-1, 0, .05]}, s: {...P.curl.s, palm: [-1, 0, .05]}},
    // Reverse curl: palms down the whole way.
    curlReverse: {...P.curl, c: {...P.curl.c, palm: [0, -.83, .55]}, s: {...P.curl.s, palm: [0, 0, -1]}},
    // A rope on a low pulley: hammer-curl hands, the strands meeting just below.
    curlRope: {...P.curl, hold: "each", implement: "rope", cable: [0, .12, .5],
      c: {...P.curl.c, upperarm: [.12, -1, -.06], palm: [-1, 0, .05]}, s: {...P.curl.s, forearm: [.1, -1, .12], palm: [-1, 0, .05]}},
    // Rope pushdown: palms facing in; the hands split apart past the thighs at the bottom.
    pushdownRope: {...P.pushdown, hold: "each", implement: "rope",
      c: {...P.pushdown.c, forearm: inC([.24, -1, .08], 10), hand: inC([.24, -1, 0], 10), palm: inC([-1, 0, 0], 10)},
      s: {...P.pushdown.s, forearm: inC([.02, .3, .95], 10), hand: inC([0, .2, 1], 10), palm: inC([-1, 0, 0], 10)}},

    // ---------- glutes ----------
    // One leg: the free leg stays straight, in line with the working thigh, its foot well off the floor.
    gluteBridgeOne: {...P.gluteBridge,
      c: {...P.gluteBridge.c, thighR: [-.14, .42, .9], shinR: [0, .42, .9], footR: [-.1, .9, .3]},
      s: {...P.gluteBridge.s, thighR: [-.1, .55, .83], shinR: [0, .55, .83], footR: [-.1, .9, .3]}},
    hipThrustOne: {...P.hipThrust,
      c: {...P.hipThrust.c, thighR: [-.16, .25, .97], shinR: [0, .25, .97], footR: [-.1, .9, .3]},
      s: {...P.hipThrust.s, thighR: [-.16, .55, .83], shinR: [0, .5, .86], footR: [-.1, .9, .3]}},
  };
}
