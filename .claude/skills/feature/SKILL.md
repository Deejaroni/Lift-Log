---
name: feature
description: Plan, build, test and ship a new Lift Log feature.
disable-model-invocation: true
argument-hint: <what you want>
---

The feature: $ARGUMENTS

1. Read CLAUDE.md, then only the files this feature touches.
2. Write a short plan in plain English: what the user will see, which files change,
   and any new stored data (which needs a migration in js/state.js). Show it to me
   and wait for my OK. Ask if anything about the look or behavior is unclear.
3. Write a test in /tests that describes the new behavior. Run it and confirm it fails.
4. Build the feature. Add any new app file to the cache list in sw.js.
5. Run `npm test` until everything passes. Check the change at 390 x 844 in light
   and dark mode.
6. If the feature involved a non-obvious choice, add it to docs/DECISIONS.md.
7. Run /ship.
