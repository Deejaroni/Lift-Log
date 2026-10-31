# Changelog

Newest first. One entry per deploy. Describe what users notice, not how the code changed.

## 2026-10-31 (second update)
- New versions no longer load half old, half new. An update downloads in the background and a note says when it's ready. Tap Reload, or it switches over the next time you fully close and reopen the app.
- Back up everything: one file with your sets, plan, body weight history and settings (Settings → Your data). Restore it on any phone; sets are never duplicated, and you choose whether to replace the plan and settings.
- Settings shows when you last backed up, and the Log tab gives a gentle reminder after two weeks without a backup (or a week of logging with none). Later puts it off for a week.
- Deleting a set, drop set or cardio entry happens right away, with an Undo button for a few seconds instead of a "Delete this set?" question.
- Fixed an error when tapping "Show all matches" in exercise search.

## 2026-10-31
- Finding an exercise is easier. Matches show as a list you tap, with each one's muscle group and equipment, instead of a long dropdown.
- Search ignores hyphens and plurals ("pushup", "cable flys") and knows common short names like RDL, OHP and pec fly.
- Typos are fixed for you, even halfway through a word: "bnch press" shows bench presses with a "Showing results for bench press" note. Tap the note to fix the search box.
- When nothing matches every word, the closest matches show instead of an empty list.
- You can search by equipment or position, like "seated cable" or "machine chest".
- With a muscle group picked, matches from other groups still show under "In other groups", so an exercise filed somewhere unexpected is still one tap away.
- The chosen exercise shows as a card with a Change button. Press Enter in the search box to take the top match.

## 2026-10-28
- On small phones, the reps and sets boxes stack with + on top and − below, so the number has room.

## 2026-10-27
- New look: the Archivo font throughout, with even-width numbers and crisper text.
- The tab bar is a floating pill with the current tab in red. It's softer gray in dark mode.
- The header shows each tab's title. On Log it shows today's workout, the next exercise, and a ring with one segment per planned exercise.
- Weight has bigger −/+ buttons, quick-add chips (+2.5, +10, +45 lb or +1.25, +5, +20 kg) and the weight and reps from last time.
- While you rest, the Log button counts down and Rest becomes +30s. The Log tab shows the time too. Logging your next set ends the rest.
- Drop sets step down in 5 lb (2.5 kg) amounts, each with its percent, like "5 lb (10%)".
- Plan shows this week as a list of training days. Today's card lists its exercises and what's next.
- History shows a bar for each set with the top set in red, the est. 1RM and a PR badge. Edit and Delete are behind the ··· button.
- Progress has a card for each main lift with its est. 1RM, 30-day change, trend line and strength tier ladder.

## 2026-10-27 (2026.10.27-c5db229)
- Settings now shows the app version at the bottom.
- Development setup: Playwright tests (smoke and math), a local server script, and versioned service-worker caches stamped at deploy time. The app behaves as before.
