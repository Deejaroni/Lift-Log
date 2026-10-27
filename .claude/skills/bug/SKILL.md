---
name: bug
description: Reproduce a Lift Log bug in a test, fix it and ship the fix.
disable-model-invocation: true
argument-hint: <what happened>
---

The bug: $ARGUMENTS

1. Read CLAUDE.md, then only the files involved.
2. Write a test in /tests that reproduces the bug, using seeded localStorage data
   (see tests/helpers.js). Run it and confirm it fails for the reason described.
   If you can't reproduce it, stop and tell me what you tried.
3. Fix the cause, not the symptom. Don't change unrelated behavior.
4. Run the new test and confirm it passes, then run `npm test`.
5. Run /ship.
