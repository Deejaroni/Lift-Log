// Lift Log: which 3D poses an exercise uses. The 2D movement pattern (js/movements.js) picks the movement; the
// name then picks the posture and setup the 3D figure shows (seated, chest-supported, on a machine, kneeling,
// lying, one-sided...). Plain module, no three.js, so the app can decide before the 3D engine loads.

// Machines hold no free weight: the pattern's own handles, pads and seat show instead.
const MACHINE = /machine|pec deck|plate-loaded|selectorized|iso-lateral|converging|hammer-style|hammer row|lever|t-bar row|high-row|hack squat|pendulum|v-squat|belt squat|glute drive|ab machine|rear-delt machine/;

// [pattern (or "*"), name test, 3D pose key, kind (optional)]. First match wins.
const RULES = [
  // Squats and legs
  ["squat", /hack squat|pendulum|v-squat|leverage squat/, "hackSquat", "machine"],
  ["squat", /belt squat/, "beltSquat", "machine"],
  ["squat", /front squat/, "frontSquat"],
  ["squat", /box squat/, "boxSquat"],
  ["squat", /smith/, "smithSquat"],
  ["squat", /shrimp|sissy/, "bwSquat", "none"],
  ["lunge", /bulgarian/, "bulgarian"],
  ["lunge", /step-up/, "stepUp"],
  ["hinge", /single-leg|smith single-leg/, "rdlSingle"],
  ["hipThrust", /glute bridge(?! machine)/, "gluteBridge"],
  ["calfRaise", /seated|soleus/, "calfSeated", "none"],
  ["calfRaise", /leg press|hack squat calf/, "calfLegPress", "none"],
  ["calfRaise", /donkey/, "calfDonkey", "none"],
  ["abduction", /side-lying/, "abductionSide", "none"],
  ["goodMorning", /seated/, "goodMorningSeated"],
  // Chest
  ["benchPress", /decline/, "benchDecline"],
  ["benchPress", /plate-loaded incline press/, "chestPress", "machine"],
  ["benchPress", /floor press/, "floorPress"],
  ["ohp", /floor press/, "floorPress"],
  ["ohp", /kettlebell bench press/, "benchPress"],
  ["fly", /cable fly — seated/, "fly", "machine"],
  ["fly", /cable fly — lying/, "flyBenchCable", "cable"],
  ["fly", /floor/, "flyFloor"],
  ["fly", /incline/, "flyIncline"],
  ["dips", /bench dip/, "benchDip"],
  ["dips", /dip machine/, "dipMachine", "machine"],
  ["pushUp", /knee push-up/, "pushUpKnee"],
  ["pushUp", /incline push-up/, "pushUpIncline"],
  ["pushUp", /decline push-up/, "pushUpDecline"],
  // Shoulders
  ["ohp", /seated|machine|plate-loaded|iso-lateral|smith/, "ohpSeated"],
  ["lateralRaise", /machine|plate-loaded/, "lateralSeated", "machine"],
  ["lateralRaise", /seated/, "lateralSeated"],
  ["lateralRaise", /incline|chest-supported|lying/, "lateralChest"],
  ["reverseFly", /pec deck|rear-delt machine|plate-loaded/, "reverseFlyMachine", "machine"],
  ["reverseFly", /seated/, "reverseFlySeated"],
  ["reverseFly", /incline|chest-supported|lying/, "reverseFlyChest"],
  ["reverseFly", /cable/, "reverseFlyCable", "cable"],
  ["yRaise", /incline|prone/, "yRaiseChest", "dumbbell"],
  ["inclinePress", /trap raise/, "yRaiseChest", "dumbbell"],
  ["shrug", /seated/, "shrugSeated"],
  ["shrug", /incline/, "shrugChest"],
  // Back
  ["bentRow", /bench supported|knee supported/, "rowOneArm", "dumbbell"],
  ["bentRow", /chest-supported|incline bench|seal row/, "rowChest"],
  ["cableRow", /standing/, "rowStanding"],
  ["cableRow", /kneeling/, "rowKneel"],
  ["cableRow", /machine|chest-supported|iso-lateral|plate-loaded|t-bar|hammer row/, "rowMachine", "machine"],
  ["pulldown", /kneeling/, "pulldownKneel"],
  ["straightArm", /kneeling/, "straightArmKneel"],
  ["pullover", /cable/, "straightArm", "cable"],
  ["pullover", /machine/, "pulloverMachine", "machine"],
  // Arms
  ["curl", /preacher|curl machine/, "curlPreacher"],
  ["curl", /concentration/, "curlConcentration", "dumbbell"],
  ["curl", /spider/, "curlSpider"],
  ["curl", /incline/, "curlIncline"],
  ["curl", /seated/, "curlSeated"],
  ["pushdown", /machine|plate-loaded/, "tricepsMachine", "machine"],
  ["overheadExt", /seated/, "overheadExtSeated"],
  ["overheadExt", /incline dumbbell triceps/, "skullCrusher"],
  ["wristCurl", /standing|behind-the-back/, "wristCurlStanding"],
  // Core
  ["crunch", /cable crunch — kneeling|single-arm cable crunch/, "cableCrunchKneel", "cable"],
  ["crunch", /cable crunch — standing/, "cableCrunchStand", "cable"],
  ["crunch", /cable crunch — seated|ab crunch machine|ab machine|plate-loaded ab/, "crunchMachine", "machine"],
  ["crunch", /decline sit-up/, "sitUpDecline"],
  ["crunch", /sit-up/, "sitUp"],
  ["crunch", /reverse crunch/, "reverseCrunch"],
  ["crunch", /bicycle/, "bicycleCrunch", "none"],
  ["crunch", /v-up/, "vUp", "none"],
  ["legRaise", /lying|flutter/, "legRaiseLying", "none"],
  ["plank", /side plank/, "sidePlank"],
  ["plank", /l-sit/, "lSit", "none"],
  ["plank", /ab wheel/, "abRollout", "none"],
  ["rotation", /seated/, "rotationSeated"],
  // Carries and kettlebells
  ["carry", /suitcase/, "carrySuitcase"],
  ["kbSwing", /single-arm/, "kbSwingOne"],
  ["kbSwing", /american/, "kbSwingAmerican"],
  ["kbClean", /double/, "kbCleanDouble"],
  ["bike", /recumbent/, "bikeRecumbent"],
];

// The 3D pose key and the kind of weight to draw for an exercise using 2D pattern `key`.
export function pose3dFor(key, name, kind){
  const n = (name || "").toLowerCase();
  let k = key, kd = kind;
  for(const [p, re, to, kk] of RULES) if((p === "*" || p === key) && re.test(n)){ k = to; if(kk) kd = kk; break; }
  if(MACHINE.test(n) && !/smith|cable/.test(n) && kd === "barbell") kd = "machine";
  return {key: k, kind: kd};
}
export const VARIANT_KEYS = [...new Set(RULES.map(r => r[2]))];
