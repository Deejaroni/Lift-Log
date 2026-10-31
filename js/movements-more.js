// Lift Log: more movement patterns (forearms, obliques, calisthenics, kettlebell and cardio machines), added to
// PATTERNS in movements.js, which passes in its shared poses and muscle bands. ES module (see docs/DECISIONS.md).
import { gear } from "./figure.js";

const r = n => Math.round(n*10)/10, P = a => a.map(r), rad = d => d*Math.PI/180;
const at = (a, deg, len) => P([a[0]+len*Math.cos(rad(deg)), a[1]+len*Math.sin(rad(deg))]);
// Middle joint (knee or elbow) for two ends and two lengths; bend (+1 / −1) picks the side.
function ik(a, b, l1, l2, bend){
  const dx=b[0]-a[0], dy=b[1]-a[1], D=Math.hypot(dx,dy), d=Math.min(D, l1+l2-.5);
  const ux=dx/D, uy=dy/D, x=(l1*l1-l2*l2+d*d)/(2*d), h=Math.sqrt(Math.max(0,l1*l1-x*x));
  return P([a[0]+ux*x-uy*h*bend, a[1]+uy*x+ux*h*bend]);
}
// A side-view body from the hip and each part's angle (degrees: 0 right, 90 down). Far limbs end in 2.
function bod(o){
  const p = {H:o.H}; p.S = at(o.H,o.torso,54); p.N = at(p.S,o.neck ?? o.torso,20);
  p.E = at(p.S,o.upper,28); p.W = at(p.E,o.fore,26);
  p.K = at(o.H,o.thigh,34); p.A = at(p.K,o.shin,33); p.T = at(p.A,o.foot ?? o.shin-85,15);
  if(o.upper2!=null){ p.E2 = at(p.S,o.upper2,28); p.W2 = at(p.E2,o.fore2,26); }
  if(o.thigh2!=null){ p.K2 = at(o.H,o.thigh2,34); p.A2 = at(p.K2,o.shin2,33); p.T2 = at(p.A2,o.foot2 ?? o.shin2-85,15); }
  return p;
}
// Front view with the upper body tilted by lean degrees about the hips; each hand reaches for a point (straight arm if out of reach).
const rot = (pt, deg, c=[100,104]) => { const a=rad(deg), x=pt[0]-c[0], y=pt[1]-c[1]; return P([c[0]+x*Math.cos(a)-y*Math.sin(a), c[1]+x*Math.sin(a)+y*Math.cos(a)]); };
function reach(s, h, bend){
  const dx=h[0]-s[0], dy=h[1]-s[1], d=Math.hypot(dx,dy), w = d>51 ? P([s[0]+dx/d*51, s[1]+dy/d*51]) : h;
  return [ik(s, w, 26, 26, bend), w];
}
function front(lean, hl, hr, bl=1, br=-1){
  const L=rot([86,42],lean), R=rot([114,42],lean), [EL,WL]=reach(L,hl,bl), [ER,WR]=reach(R,hr,br);
  return {N:rot([100,22],lean), L, R, EL, WL, ER, WR, lean:[lean,0]};
}
const hands = p => [(p.WL[0]+p.WR[0])/2, (p.WL[1]+p.WR[1])/2];
const cableTo = from => p => ({back: gear.path(`M${from[0]-2} 166V8`) + gear.dot(from), front: gear.line(from, hands(p)) + gear.handle(hands(p))});
const ring = (x, y, rr) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="none" stroke="var(--muted)" stroke-width="4"/>`;
const mat = gear.rect(14,166,172,3,1.5);

// ---------- cardio: a pose for any moment of the loop ----------
function bikePose(t){
  const H=[84,96], S=[110,51], Wb=[146,64], C=[116,140], th=rad(360*t);
  const leg = a => { const pd=[C[0]+13*Math.cos(a), C[1]+13*Math.sin(a)], A=P([pd[0]-5,pd[1]-3]); return {K:ik(H,A,34,33,-1), A, T:P([pd[0]+9,pd[1]+1]), pd:P(pd)}; };
  const n=leg(th), f=leg(th+Math.PI), W2=[Wb[0]-5,Wb[1]-2];
  return {N:[121,34], S, H, E:ik(S,Wb,28,26,1), W:Wb, E2:ik([S[0]-4,S[1]-2],W2,28,26,1), W2,
    K:n.K, A:n.A, T:n.T, K2:f.K, A2:f.A, T2:f.T, Pn:n.pd, Pf:f.pd};
}
function treadPose(t){
  const ph=rad(360*t), bob=2*Math.abs(Math.sin(ph)), H=[100,96+bob], S=[105,42+bob];
  const leg = q => { const a=26*Math.sin(q), b=6+48*Math.max(0,Math.cos(q))**1.5, K=at(H,90-a,34), A=at(K,90-a+b,33); return {K, A, T:at(A,90-a+b-85,15)}; };
  const arm = q => { const c=-24*Math.sin(q), E=at(S,90-c,28); return {E, W:at(E,90-c-75,24)}; };
  const n=leg(ph), f=leg(ph+Math.PI), an=arm(ph), af=arm(ph+Math.PI);
  return {N:[110,r(22+bob)], S, H, E:an.E, W:an.W, E2:af.E, W2:af.W, K:n.K, A:n.A, T:n.T, K2:f.K, A2:f.A, T2:f.T};
}
function rowPose(H, lean, W){
  const A=[146,140], S=at(H,270+lean,54);
  return {H, S, N:at(S,270+lean*1.1,20), E:ik(S,W,28,26,1), W, K:ik(H,A,34,33,-1), A, T:[154,127]};
}

export function morePatterns({B, STAND, PATTERNS}){
  const flip = b => ({...b, side:-b.side}), ob = [["obliques","Abdominals"]], fore = side => [{seg:"fore", f:[.05,.9], side, m:"Forearms"}];
  const HINGE = PATTERNS.kbSwing.A, OVER = PATTERNS.ohp.B, PLANK = {...PATTERNS.pushUp.A, K2:[60,146], A2:[38,161], T2:[32,166]};
  // Wrist curls: seated, forearms along the thighs; the weight swings around the wrist.
  const WC = {N:[140,62],S:[126,77],E:[116,104],W:[141,106],H:[92,118],K:[128,118],A:[128,160],T:[142,161]};
  const wcGear = (p,k,t) => { const a=rad(70-120*t), q=[p.W[0]+Math.cos(a)*8, p.W[1]+Math.sin(a)*8];
    return {back: gear.rect(56,124,64,7) + gear.path("M66 131V166M110 131V166"),
      front: k==="cable" ? gear.line([150,166],q)+gear.handle(q) : k==="dumbbell" ? gear.bell(q) : gear.plate(q,10)}; };
  const sbA = {...front(0,[86,90],[121,94]), EL:[70,66], WL:[86,90], ER:[120,68], WR:[121,94]}, sbB = front(16,[0,0],[0,0]);
  Object.assign(sbB, {EL:rot([70,66],16), WL:rot([86,90],16), ER:P([sbB.R[0]+2,sbB.R[1]+26]), WR:P([sbB.R[0]+3,sbB.R[1]+52])});
  const chopHi = front(10,[176,-4],[176,-4],-1,-1), chopLo = front(-14,[40,140],[40,140],1,1);
  const QUAD = o => bod({H:[80,126], torso:342, neck:345, upper:92, fore:90, thigh:90, shin:180, foot:182, upper2:90, fore2:90, thigh2:88, shin2:180, foot2:182, ...o});
  const invB = bod({H:[118,121], torso:213, neck:213, upper:0, fore:0, thigh:33, shin:33, foot:-45}); invB.W = [66,72]; invB.E = ik(invB.S,invB.W,28,26,1);
  const deadBug = (arm2, leg) => bod({H:[112,154], torso:180, neck:182, upper:272, fore:272, ...leg, foot:-90, ...arm2, thigh2:268, shin2:2, foot2:-88});
  return {
    wristCurl:{title:"Wrist curl", noShadow:true, A:WC, B:WC, bands:fore(-1), gear:wcGear,
      steps:["Sit with your forearms on your thighs, palms up, wrists past your knees.","Curl the weight up by bending only your wrists.","Lower it slowly as far as it goes."]},
    reverseWristCurl:{title:"Wrist curl", noShadow:true, A:WC, B:WC, bands:fore(1), gear:wcGear,
      steps:["Sit with your forearms on your thighs, palms down, wrists past your knees.","Lift the backs of your hands, bending only your wrists.","Lower slowly."]},
    sideBend:{title:"Side bend", view:"front", A:sbA, B:sbB, regions:ob,
      gear:(p,k)=>({front: k==="cable" ? gear.line([126,166],p.WR)+gear.handle(p.WR) : k==="none" ? "" : gear.bell([p.WR[0],p.WR[1]+3])}),
      steps:["Stand tall, weight in one hand, other hand on your hip.","Lean toward the weight, straight to the side.","Pull yourself back up with your other side."]},
    chop:{title:"Woodchop", view:"front", A:chopHi, B:chopLo, regions:ob, gear:cableTo([184,14]),
      steps:["Stand side-on to the cable, hands together up high.","Pull it down and across your body, turning through your trunk.","Return slowly."]},
    chopUp:{title:"Woodchop", view:"front", A:chopLo, B:chopHi, regions:ob, gear:cableTo([18,150]),
      steps:["Stand side-on to the cable, hands together down low.","Pull it up and across your body, turning through your trunk.","Return slowly."]},
    rotation:{title:"Cable rotation", view:"front", A:front(-8,[0,62],[0,62],1,1), B:front(8,[200,62],[200,62],-1,-1), regions:ob, gear:cableTo([18,60]),
      steps:["Stand side-on to the cable, arms straight at chest height.","Turn your trunk away from the cable, arms following.","Turn back slowly."]},

    invertedRow:{title:"Inverted row", noShadow:true, A:bod({H:[111,141], torso:198, neck:198, upper:270, fore:270, thigh:18, shin:18, foot:-60}), B:invB,
      bands:[flip({...B.lats, f:[.08,.6]}), flip(B.biceps)], gear:()=>({back: gear.path("M24 166V60M24 72H82",5)}),
      steps:["Hang under a bar at hip height, body straight, heels on the floor.","Pull your chest to the bar, squeezing your shoulder blades.","Lower until your arms are straight."]},
    pikePushUp:{title:"Pike push-up", head:"front",
      A:{N:[60,116],S:[74,110],E:[72,136],W:[70,162],H:[124,96],K:[132,129],A:[140,162],T:[154,166]},
      B:{N:[64,146],S:[78,134],E:[96,146],W:[70,162],H:[122,104],K:[132,134],A:[140,162],T:[154,166]},
      bands:[B.frontDelt, B.triceps], steps:["Hands and feet on the floor, hips high in an upside-down V.","Bend your elbows to lower the top of your head toward the floor.","Press back up to straight arms."]},
    handstandPushUp:{title:"Handstand push-up", head:"front", noShadow:true,
      A:{N:[98,124],S:[100,108],E:[106,135],W:[110,162],H:[104,56],K:[118,26],A:[124,0],T:[128,-2]},
      B:{N:[96,150],S:[100,132],E:[86,146],W:[110,162],H:[106,80],K:[120,50],A:[124,18],T:[128,16]},
      bands:[B.frontDelt, B.triceps], gear:()=>({back: gear.path("M132 166V-4",5)}),
      steps:["Kick up into a handstand, feet against the wall.","Lower your head toward the floor with control.","Press back up to straight arms."]},
    nordic:{title:"Nordic curl", noShadow:true,
      A:{N:[60,52],S:[60,72],E:[66,100],W:[78,120],H:[60,126],K:[60,160],A:[27,160],T:[16,150]},
      B:{N:[130,112],S:[113,121],E:[128,140],W:[142,156],H:[89,145],K:[60,160],A:[27,160],T:[16,150]},
      bands:[flip(B.hams), B.glutes], gear:()=>({back: gear.rect(18,163,62,4,2), front: gear.dot([24,151],5)}),
      steps:["Kneel with your ankles held down, body straight.","Lean forward slowly from your knees, hips straight.","Catch yourself, then pull back up with your hamstrings."]},
    mountainClimber:{title:"Mountain climber", head:"front", A:PLANK, B:{...PLANK, K:[116,136], A:[100,160], T:[112,164]},
      bands:[B.abs, flip(B.quads)], steps:["Start in a push-up position, hands under your shoulders.","Drive one knee toward your chest.","Switch legs quickly, keeping your hips low."]},
    squatThrust:{title:"Squat thrust", head:"front", B:PLANK,
      A:{N:[136,86],S:[124,102],E:[130,130],W:[134,162],H:[84,138],K:[116,140],A:[96,165],T:[113,166],K2:[114,142],A2:[94,165],T2:[111,166]},
      bands:[B.quads, B.chest], steps:["Squat down and put your hands on the floor.","Jump your feet back into a push-up position.","Jump them back in and stand up (add a jump for a burpee)."]},
    wallSit:{title:"Wall sit", A:{N:[78,54],S:[76,74],E:[86,100],W:[106,112],H:[78,128],K:[112,128],A:[112,162],T:[127,165]},
      bands:[B.quads, B.glutes], gear:()=>({back: gear.path("M64 166V22",5)}),
      steps:["Back flat against the wall.","Slide down until your thighs are level, knees over ankles.","Hold."]},
    // The far arm (drawn lighter) and the near leg move, so the arm and leg are on opposite sides.
    deadBug:{title:"Dead bug", noShadow:true, A:deadBug({upper2:268, fore2:268}, {thigh:270, shin:0}), B:deadBug({upper2:192, fore2:186}, {thigh:345, shin:352}),
      bands:[flip(B.abs)], gear:()=>({back: mat}),
      steps:["Lie on your back, arms up, knees bent over your hips.","Lower one arm and the opposite leg toward the floor, low back pressed down.","Bring them back and switch sides."]},
    hollow:{title:"Hollow hold", noShadow:true, A:bod({H:[106,150], torso:196, neck:200, upper:200, fore:198, thigh:342, shin:344, foot:-80}),
      bands:[flip(B.abs)], gear:()=>({back: mat}),
      steps:["Lie on your back, arms overhead.","Lift your shoulders and legs, pressing your low back into the floor.","Hold the curved shape."]},
    superman:{title:"Superman", noShadow:true,
      A:bod({H:[104,155], torso:180, neck:180, upper:180, fore:180, thigh:0, shin:0, foot:70}),
      B:bod({H:[104,155], torso:190, neck:196, upper:198, fore:198, thigh:350, shin:352, foot:70}),
      bands:[flip(B.lowBack), flip(B.glutes), flip(B.hams)], gear:()=>({back: mat}),
      steps:["Lie face down, arms overhead.","Lift your arms, chest and legs off the floor together.","Pause, then lower slowly."]},
    birdDog:{title:"Bird dog", A:QUAD({}), B:QUAD({upper:344, fore:342, thigh2:186, shin2:182, foot2:190}),
      bands:[B.lowBack, B.glutes], gear:()=>({back: mat}),
      steps:["On hands and knees, back flat.","Reach one arm forward and the opposite leg back.","Hold a moment, return and switch sides."]},
    donkeyKick:{title:"Donkey kick", A:QUAD({}), B:QUAD({thigh:200, shin:276, foot:186}), bands:[B.glutes], gear:()=>({back: mat}),
      steps:["On hands and knees, back flat.","Keep your knee bent and push your foot up toward the ceiling.","Lower without arching your back."]},
    reverseHyper:{title:"Reverse hyper", noShadow:true,
      A:{N:[34,94],S:[54,98],E:[58,124],W:[64,138],H:[104,98],K:[108,132],A:[108,160],T:[120,164]},
      B:{N:[34,94],S:[54,98],E:[58,124],W:[64,138],H:[104,98],K:[138,102],A:[170,96],T:[176,108]},
      bands:[flip(B.glutes), flip(B.hams), flip(B.lowBack)],
      gear:p=>({back: gear.rect(36,105,70,8) + gear.path("M50 113V166M92 113V166M60 138H72",5), front: gear.dot([p.A[0]+2,p.A[1]-4],5)}),
      steps:["Lie face down on the pad, hips at the edge, legs hanging.","Swing your legs up behind you until they're level.","Lower with control."]},
    yRaise:{title:"Y-raise", view:"front", head:"rear",
      A:{N:[100,22],L:[86,42],R:[114,42],EL:[80,68],WL:[79,94],ER:[120,68],WR:[121,94]},
      B:{N:[100,22],L:[86,40],R:[114,40],EL:[71,19],WL:[56,-1],ER:[129,19],WR:[144,-1]},
      regions:[["traps","Back"]], bands:[{seg:"upperL", f:[-.2,.45], side:1, m:"Shoulders:side"},{seg:"upperR", f:[-.2,.45], side:-1, m:"Shoulders:side"}],
      gear:(p,k)=>({front: k==="cable" ? gear.handle(p.WL)+gear.handle(p.WR) : gear.bell(p.WL)+gear.bell(p.WR)}),
      steps:["Light weights, thumbs up, arms down.","Raise your arms up and out into a Y.","Lower slowly."]},

    kbClean:{title:"Kettlebell clean", A:HINGE, B:{...STAND, E:[110,70], W:[112,46]}, bands:[B.glutes, B.hams, B.lowBack],
      gear:p=>({front: gear.kettlebell([p.W[0]+2,p.W[1]-2])}),
      steps:["Hinge with the bell between your feet, back flat.","Snap your hips forward and pull the bell close to your body.","Let it roll onto your forearm at your shoulder."]},
    kbSnatch:{title:"Kettlebell snatch", A:HINGE, B:OVER, bands:[B.glutes, B.hams, B.frontDelt],
      gear:p=>({front: gear.kettlebell([p.W[0],p.W[1]-2])}),
      steps:["Hinge with the bell between your feet, back flat.","Snap your hips forward and pull the bell up close to your body.","Punch your hand up so the bell lands overhead, arm straight."]},
    thruster:{title:"Thruster", head:"front", B:OVER,
      A:{N:[124,72],S:[112,88],E:[134,98],W:[124,82],H:[76,128],K:[122,124],A:[101,165],T:[118,166]},
      bands:[B.quads, B.glutes, B.frontDelt, B.triceps], gear:(p,k)=>({front: k==="barbell" ? gear.plate(p.W,13) : gear.held(k,p.W)}),
      steps:["Squat down with the weight at your shoulders.","Stand up hard and press the weight overhead in one move.","Bring it back to your shoulders as you squat again."]},

    // Cardio machines loop continuously and highlight no muscles.
    bike:{title:"Bike", loop:true, noShadow:true, pose:bikePose, A:bikePose(0),
      gear:p=>({back: gear.rect(72,99,26,5,2.5) + gear.path("M84 104L116 140L146 66H156M116 140L96 166M116 140L162 166M78 166H176",5) + ring(160,138,17),
        front: gear.line(p.Pf,p.Pn,4) + gear.dot(p.Pn,3) + gear.dot([116,140],4)})},
    treadmill:{title:"Treadmill", loop:true, noShadow:true, pose:treadPose, A:treadPose(0),
      gear:()=>({back: gear.rect(28,166,154,5,2.5) + gear.path("M174 166L160 66M160 72H134",5)})},
    rower:{title:"Rower", noShadow:true, A:rowPose([98,142],28,[150,114]), B:rowPose([74,142],-22,[86,112]),
      gear:p=>({back: gear.path("M30 154H186M40 154V166M178 154V166",5) + gear.rect(r(p.H[0]-14),146,28,7,2) + gear.path("M150 146L160 120",5) + ring(176,122,15),
        front: gear.line(p.W,[176,122]) + gear.handle(p.W)})},
  };
}
