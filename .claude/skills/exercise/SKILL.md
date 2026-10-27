---
name: exercise
description: Add exercises to the Lift Log library with muscle group, equipment and a how-to hint.
disable-model-invocation: true
argument-hint: <names>
---

Exercises to add: $ARGUMENTS

The library is the exercise catalog text (`CATALOG_TEXT`): `# Muscle` lines, then
`## Subgroup` lines, then one exercise per line. Cardio lines end with `|type`
(treadmill, bike, rower, ...).

For each exercise:
1. Check it isn't already in the catalog under another name. If it is, tell me and skip it.
2. Put it under the right `# Muscle` and the closest `## Subgroup`, in the name style
   the catalog already uses (e.g. "Seated cable row — wide grip").
3. Make sure the equipment guess (`suggestEquip`) picks the right equipment and
   one-side setting from its name. Extend the patterns only if it doesn't.
4. If the movement isn't obvious from its name, add a one- or two-sentence how-to
   hint to `EX_INFO`, in plain words.
5. If you're unsure of the muscle group or equipment, ask me before adding it.

Then add a test that picks each new exercise on the Log tab and checks its muscle
group and equipment, run `npm test`, and run /ship.
