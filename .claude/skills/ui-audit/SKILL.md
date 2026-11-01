---
name: ui-audit
description: Audit Lift Log's look and usability at phone size in light and dark mode, and report ranked findings without changing anything.
disable-model-invocation: true
argument-hint: [area to focus on, optional]
---

Focus (optional): $ARGUMENTS

This is a report, not a fix. Change no app files until I say which findings to fix.

1. Run `npm run audit:ui`. It opens the app with the sample data in tests/fixtures/demo.js
   (six weeks of lifts, cardio, a drop set, a superset, body weight, a loaded plan) at 390 x 844 in
   light and dark, screenshots each screen, and measures:
   - tap targets under 40 px
   - text below WCAG contrast (4.5:1, or 3:1 for large text)
   - fields and buttons with no screen-reader name
   - sideways scrolling and console errors
   - colors in css/app.css that aren't tokens, and browser pop-ups in the code
   If a screen it needs is missing (a new tab or sheet), add it to `SCREENS` in tools/ui-audit.mjs first.
2. Look at every screenshot in tools/out/ui-audit/index.html yourself, light and dark, and judge what
   the script can't measure:
   - Consistency: the same thing looks and is worded the same everywhere (buttons, chips, cards, headings,
     numbers, units, "est. 1RM").
   - Wording: short, plain, sentence case; no jargon a gym-goer wouldn't use.
   - Hierarchy: the main action on each screen is the most obvious thing; nothing important is below the
     tab bar or cut off at 390 px.
   - Accents: plate red, blue, yellow and green mean the same thing on every screen.
   - Font: Archivo throughout, condensed (font-stretch) only for headings and numbers.
   - Dark mode: nothing too bright, invisible or low-contrast that the measurements missed.
   - One-handed use: frequent actions within reach of a thumb, destructive ones not next to common ones.
3. Write up the findings, most important first. For each: what's wrong, where (screen and mode), why it
   matters at the gym, and the fix you'd suggest. Group the script's repeats into one item each. Say which
   findings you checked by eye and which were measured. Note anything you couldn't check.
4. Send me the report page (tools/out/ui-audit/index.html) and ask which findings to fix.
   Visual changes go through /mockup first; small wording, color or spacing fixes can use /tweak.
