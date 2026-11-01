---
name: mockup
description: Show a phone-size mockup of a Lift Log visual change, in light and dark mode, and wait for approval before building it.
disable-model-invocation: true
argument-hint: <what it should look like>
---

The change: $ARGUMENTS

Mockups come before any visual build. Don't change app files in this step.

1. Read CLAUDE.md, then only the files that draw the part being changed (and css/app.css for the
   classes and color tokens it already uses).
2. Write a spec in tools/out/mockup/ (copy tools/mockups/example.mjs). Use the app's own classes and
   `var(--token)` colors in card HTML, never new hard-coded colors. For an animation, give a draft pattern
   object (or a key in PATTERNS) with `kind` and `roles`, like the patterns in js/movements.js.
   - Use realistic content: real exercise names from the library, real numbers and units, the wording
     the app would actually show.
   - If there are real alternatives (layout, wording, where a button goes), show each as its own card.
3. Run `npm run mockup -- tools/out/mockup/<name>.mjs`. Look at the start and end stills it writes
   (tools/out/mockup/<name>-start.png and -end.png) and fix anything off before I see it: clipping at
   390 px, unreadable text in dark mode, tap targets under 40 px, muscles highlighted on the wrong side.
4. Send me tools/out/mockup/<name>.html (it opens anywhere and animates). Say in a few lines what I'm
   looking at, which choices are still open, and what else would change if I approve (data, names, search).
5. Wait for my OK. Then build it with /feature, or /tweak if it's only wording, color or spacing.
