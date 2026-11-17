// The 3D pictures show the movement and the equipment each exercise really uses (found in a review of every
// exercise's picture, 2026-11-17).
const { test, expect } = require("@playwright/test");
const { openApp } = require("./helpers");

test("exercises draw the weight they actually use", async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(async () => {
    const { visualFor } = await import("/js/visuals.js");
    const want = {
      "Hammer curl": "dumbbell", "Cross-body hammer curl": "dumbbell", "Zottman curl": "dumbbell", "Farmer's carry": "dumbbell", "Suitcase carry": "dumbbell",
      "Turkish get-up": "kettlebell", "Arnold press": "dumbbell", "Scaption raise (thumbs-up, scapular plane)": "dumbbell", "Pallof press": "cable",
      "Face pull": "cable", "Glute bridge": "none", "Single-leg glute bridge": "none", "Bird dog": "none", "Dead bug": "none", "Donkey kick": "none",
      "Superman": "none", "Mountain climber": "none", "Hollow body hold": "none", "Wall sit": "none", "Burpee": "none", "Jump squat": "none",
      "Pistol squat": "none", "Inverted row": "none", "Toes-to-bar": "none", "Nordic hamstring curl": "none", "Back extension": "none",
      "Reverse hyperextension": "none", "Banded hip abduction": "none", "Handstand hold": "none", "Jumping lunge": "none", "Muscle-up": "none",
    };
    return Object.entries(want).filter(([n, k]) => visualFor(n).kind3d !== k).map(([n, k]) => `${n}: ${visualFor(n).kind3d} (want ${k})`);
  });
  expect(r).toEqual([]);
  expect(errors).toEqual([]);
});

test("movements that differ from their family get their own picture", async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(async () => {
    const { visualFor } = await import("/js/visuals.js");
    const want = {
      "Pallof press": "pallof", "Pistol squat": "pistol", "Assisted pistol squat": "pistol", "Shrimp squat": "shrimpSquat", "Sissy squat": "sissySquat",
      "Scaption raise (thumbs-up, scapular plane)": "scaption", "Hammer curl": "curlHammer", "Cross-body hammer curl": "curlHammer", "Kettlebell hammer curl": "curlHammer",
      "Reverse curl": "curlReverse", "EZ-bar reverse curl": "curlReverse", "Dumbbell reverse curl": "curlReverse", "Cable reverse curl": "curlReverse",
      "Rope hammer curl": "curlRope", "Rope pushdown": "pushdownRope", "Arnold press": "arnold", "Seated cable hip abduction": "abductionSeated",
      "Single-leg glute bridge": "gluteBridgeOne", "Single-leg hip thrust": "hipThrustOne", "Single-leg dumbbell hip thrust": "hipThrustOne",
    };
    return Object.entries(want).filter(([n, k]) => visualFor(n).key3d !== k).map(([n, k]) => `${n}: ${visualFor(n).key3d} (want ${k})`);
  });
  expect(r).toEqual([]);
  expect(errors).toEqual([]);
});

test("the new and fixed poses move the way the exercise does", async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(async () => {
    const m = await import("/js/figure3d.js"); await m.load("/models/body.glb");
    const J = (k, kind, s) => m.check(k, kind, s), d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const mid = j => j.hand_L.map((v, i) => (v + j.hand_R[i]) / 2);
    const out = {};
    // Hip thrusts and glute bridges with a dumbbell, kettlebell or machine: both hands hold the weight on the hips.
    out.hipHands = [["hipThrust", "dumbbell"], ["hipThrust", "kettlebell"], ["gluteBridge", "dumbbell"], ["hipThrust", "machine"]].flatMap(([k, kind]) =>
      [0, 1].map(s => { const j = J(k, kind, s); return [`${k}/${kind}/${s}`, +d(mid(j), j.hips).toFixed(2)]; })).filter(([, x]) => x > .32);
    // One-leg bridges and thrusts: the free foot is well off the floor.
    out.oneLeg = ["gluteBridgeOne", "hipThrustOne"].map(k => { const j = J(k, "none", 0); return +(j.foot_R[1] - j.foot_L[1]).toFixed(2); });
    // Pallof press: no twist. The hands stay in front of the chest's middle and press straight out.
    const p0 = J("pallof", "cable", 0), p1 = J("pallof", "cable", 1);
    out.pallof = { side: +Math.max(Math.abs(mid(p0)[0] - p0.chest[0]), Math.abs(mid(p1)[0] - p1.chest[0])).toFixed(2),
      reach: +(d(mid(p0), p0.chest) - d(mid(p1), p1.chest)).toFixed(2), turn: +Math.abs(p0.head[0] - p1.head[0]).toFixed(2) };
    // Pistol: one leg reaches forward off the floor at the bottom; the standing leg folds deep.
    const ps = J("pistol", "none", 1); out.pistol = { freeFoot: +ps.foot_R[1].toFixed(2), hipDrop: +(ps.hips[1]).toFixed(2), freeAhead: +(ps.foot_R[2] - ps.foot_L[2]).toFixed(2) };
    // Sissy squat: knees travel well past the toes and the body leans back.
    const ss = J("sissySquat", "none", 1); out.sissy = { kneesAhead: +(ss.shin_L[2] - ss.toe_L[2]).toFixed(2), leanBack: +(ss.hips[2] - ss.head[2]).toFixed(2) };
    // Shrimp: the back knee comes down behind, near the floor.
    const sh = J("shrimpSquat", "none", 1); out.shrimp = { backKnee: +sh.shin_R[1].toFixed(2), behind: +(sh.hips[2] - sh.shin_R[2]).toFixed(2) };
    // Scaption: both arms rise to shoulder height, angled forward of straight out to the side, thumbs up.
    const sc = J("scaption", "dumbbell", 0), sideL = sc.hand_L[0] - sc.chest[0], fwdL = sc.hand_L[2] - sc.chest[2];
    out.scaption = { angle: Math.round(Math.atan2(fwdL, sideL) * 180 / Math.PI), height: +(sc.hand_L[1] - sc.upperarm_L[1]).toFixed(2),
      even: +Math.abs(sc.hand_L[1] - sc.hand_R[1]).toFixed(2) };
    // Hammer curls keep the thumbs up: the palms face each other the whole way.
    out.hammer = [m.POSES.curlHammer.c.palm, m.POSES.curlHammer.s.palm].map(p => +Math.abs(p[0]).toFixed(2));
    // Rope pushdown: the hands spread apart at the bottom.
    const r0 = J("pushdownRope", "cable", 0), r1 = J("pushdownRope", "cable", 1);
    out.rope = { bottom: +Math.abs(r0.hand_L[0] - r0.hand_R[0]).toFixed(2), top: +Math.abs(r1.hand_L[0] - r1.hand_R[0]).toFixed(2) };
    // Arnold press: the palms face you at the bottom and turn forward at the top.
    const a0 = J("arnold", "dumbbell", 0), a1 = J("arnold", "dumbbell", 1);
    out.arnold = { topHigh: +(a0.hand_L[1] - a0.head[1]).toFixed(2), bottomLow: +(a1.hand_L[1] - a1.head[1]).toFixed(2) };
    return out;
  });
  expect(r.hipHands).toEqual([]);
  r.oneLeg.forEach(x => expect(x).toBeGreaterThan(.2));
  expect(r.pallof.side).toBeLessThan(.08);
  expect(r.pallof.reach).toBeGreaterThan(.2);
  expect(r.pallof.turn).toBeLessThan(.04);
  expect(r.pistol.freeFoot).toBeGreaterThan(.12);
  expect(r.pistol.hipDrop).toBeLessThan(.6);
  expect(r.pistol.freeAhead).toBeGreaterThan(.4);
  expect(r.sissy.kneesAhead).toBeGreaterThan(.18);
  expect(r.sissy.leanBack).toBeGreaterThan(.05);
  expect(r.shrimp.backKnee).toBeLessThan(.25);
  expect(r.shrimp.behind).toBeGreaterThan(.1);
  expect(r.scaption.angle).toBeGreaterThan(15);
  expect(r.scaption.angle).toBeLessThan(45);
  expect(Math.abs(r.scaption.height)).toBeLessThan(.12);
  expect(r.scaption.even).toBeLessThan(.03);
  r.hammer.forEach(x => expect(x).toBeGreaterThan(.9));
  expect(r.rope.bottom - r.rope.top).toBeGreaterThan(.08);
  expect(r.arnold.topHigh).toBeGreaterThan(.2);
  expect(r.arnold.bottomLow).toBeLessThan(0);
  expect(errors).toEqual([]);
});

test("the kind of weight decides what the hands hold, and cables only show with a cable", async ({ page }) => {
  const errors = await openApp(page);
  const r = await page.evaluate(async () => {
    const THREE = await import("three"), m = await import("/js/figure3d.js"); await m.load("/models/body.glb");
    // Counts the meshes in a gear group by geometry: bells (kettlebells), plates (dumbbell ends and plates), thin cables.
    const count = (key, kind) => {
      const root = new THREE.Group(), M = new Proxy({}, { get: () => new THREE.MeshBasicMaterial() });
      const g = m.buildGear(root, m.POSES[key], kind, M); let bells = 0, dbEnds = 0, cables = 0, rope = 0, handles = 0;
      g.traverse(o => { const t = o.geometry && o.geometry.type, p = o.geometry && o.geometry.parameters;
        if(t === "SphereGeometry" && p.radius < .1) bells++; if(t === "CylinderGeometry" && p.radiusTop === .065) dbEnds++;
        if(t === "CylinderGeometry" && p.radiusTop === .005) cables++; if(o.userData.rope) rope++;
        if(t === "CylinderGeometry" && p.radiusTop === .014 && Math.abs(o.scale.x - .14) < .001) handles++; });
      return { bells, dbEnds, cables, rope, handles };
    };
    return { kbCarry: count("carry", "kettlebell"), cableBend: count("sideBend", "cable"), cableRearFly: count("reverseFlySeated", "cable"),
      dbRearFly: count("reverseFlySeated", "dumbbell"), rope: count("pushdownRope", "cable"), getUp: count("getUp", "kettlebell"),
      machines: ["ohpSeated", "shrug", "lateralSeated", "sideBend"].map(k => count(k, "machine")) };
  });
  expect(r.kbCarry).toMatchObject({ bells: 2, dbEnds: 0 });
  expect(r.cableBend).toMatchObject({ dbEnds: 0 });
  expect(r.cableBend.cables).toBeGreaterThan(0);
  expect(r.cableRearFly).toMatchObject({ dbEnds: 0, cables: 2 });
  expect(r.dbRearFly).toMatchObject({ dbEnds: 4, cables: 0 });
  expect(r.rope.rope).toBeGreaterThan(0);
  expect(r.getUp.bells).toBe(1);
  // Machines show their handles where the hands hold on, never a free weight.
  expect(r.machines.map(x => x.handles)).toEqual([2, 2, 2, 1]);
  expect(r.machines.map(x => x.dbEnds + x.bells)).toEqual([0, 0, 0, 0]);
  expect(errors).toEqual([]);
});
