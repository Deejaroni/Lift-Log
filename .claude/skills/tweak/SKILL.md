---
name: tweak
description: Make a small wording, color or spacing change to Lift Log and ship it.
disable-model-invocation: true
argument-hint: <small change>
---

The tweak: $ARGUMENTS

No plan step. This is for wording, colors and spacing only. If the change turns out
to affect behavior or stored data, stop and suggest /feature instead.

1. Make the change. Use the color tokens in css/app.css; never hard-code colors.
   Keep wording short, plain and in sentence case.
2. If a test checks the old wording, update it.
3. Run `npm test`. Check the change at 390 x 844 in light and dark mode.
4. Run /ship.
