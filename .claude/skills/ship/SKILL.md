---
name: ship
description: Test, record and publish the current changes to Lift Log.
disable-model-invocation: true
allowed-tools: Bash(npm test) Bash(git add *) Bash(git commit *) Bash(git push) Bash(gh run *)
---

1. Run `npm test`. If anything fails, stop and show me what failed. Do not push.
2. Add a line to docs/CHANGELOG.md (today's date, one plain sentence per change).
3. Commit with a short message describing the change for a non-programmer.
4. Push to main, then wait for the "Test and publish" run with `gh run watch`.
5. Tell me the published version and remind me to reopen the app on my phone.
