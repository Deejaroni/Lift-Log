---
name: ui-audit
description: Audit Lift Log's look and usability at phone size in light and dark mode, and report ranked findings without changing anything.
disable-model-invocation: true
argument-hint: [area to focus on, optional]
---

Focus (optional): $ARGUMENTS

This is a report, not a fix. Change no app files until I say which findings to fix.

1. Run `npm run audit:ui` (about 2 minutes). It opens the app with the sample data in tests/fixtures/demo.js
   (six weeks of lifts, cardio, a drop set, a superset, body weight, a loaded plan) at 390 x 844 in
   light and dark, on a fixed day with reduce motion on, screenshots each screen, and measures:
   - tap targets under 40 px
   - text below WCAG contrast (4.5:1, or 3:1 for large text)
   - fields and buttons with no screen-reader name
   - sideways scrolling and console errors
   - colors in css/app.css that aren't tokens, and browser pop-ups in the code
   - text cut off, text spilling out of its box, overlapping items
   - edges 1–3 px off their neighbors, text inside the 16 px side margin
   - buttons with no pressed look, things that move after a screen opens or keep moving with reduce motion on
   - labels that wrap, labels not in sentence case, the same thing said two ways
   - frequent Log controls in the hard-to-reach area for a thumb (a map of the Log tab)
   - tap-to-screen times with the CPU slowed 4× (aim: 100 ms per tap)
   - every font size, weight, radius, spacing value, shadow and transition in use, with odd ones marked
   - edge cases: first launch, long names and big numbers in kg, text at 130% and 200%
   - what changed since the last run, in red
   If a screen it needs is missing (a new tab or sheet), add it to `SCREENS` in tools/ui-audit.mjs first;
   the in-page checks are in tools/audit/page.mjs, scenarios in tools/audit/scenarios.mjs and the report in
   tools/audit/report.mjs.
2. Look at every screenshot in tools/out/ui-audit/index.html yourself, light and dark, and judge what
   the script can't measure. Treat its own estimates (thumb zones, speed, odd sizes) as leads to check,
   not verdicts; speed varies a few tens of ms between runs, so rerun before reporting something slow.
   At 200% text some breakage is expected; what breaks at 130% matters more.
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
