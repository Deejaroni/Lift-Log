# Changelog

Newest first. One entry per deploy. Describe what users notice, not how the code changed.

## Next update
- Behind the scenes: the app's code files are now JavaScript modules, each listing what it shares. Nothing looks or works differently.

## 2026-10-31 (sixth update)
- Behind the scenes: the app's code moved out of index.html into smaller files. Nothing looks or works differently.
- Behind the scenes: the publishing setup is updated (current GitHub actions on Node 24, and a fixed Ubuntu version) so updates keep publishing reliably.

## 2026-10-31 (fifth update)
- Progress opens with a Consistency panel: a month calendar with training days filled in (red for lifting, blue for cardio or mobility), and a weekly streak, like "3-week streak · 2 of 3 days this week". Set your weekly goal (2–6 days); a week still in progress never breaks the streak. Tap a training day to open it in History.

## 2026-10-31 (fourth update)
- Change an exercise's muscle groups: tap its name in History, or tap the chosen exercise on the Log tab ("Edit muscles"). Pick the main muscle group and what else it works. Every past set moves to the new group, and History, Progress, Plan and search all follow.
- "Also works" starts from the exercise library, so Romanian deadlift already counts toward Lower back. When you browse or search by a muscle group, exercises that also work it are listed there, marked "Also works".
- Rename or merge your own exercises from the same sheet. It suggests names that look like the same exercise ("Pec dec" → "Pec deck"), and choosing a name you already have merges the two after you confirm. Renames carry over to your plan.
- Cleaner exercise list: four duplicate spellings removed (sets you logged under them now use the kept name), and hammer curls listed once.
- Bench presses, rows, pulldowns, squats, lunges, deadlifts and hammer curls now list the other muscles they work, like triceps and shoulders for the bench press.
- Progress has a new Sets per muscle panel: this week's sets for each muscle group next to last week's. A set counts half for each other muscle the lift works, a drop set counts once, and untrained groups show 0 so gaps stand out. A shaded 10–20 band marks a common weekly target, labeled as a rough guide.

## 2026-10-31 (third update)
- Plate calculator: with Barbell or Smith machine on, the plates for each side show under the weight, in bumper-plate colors. A barbell with no bar weight set assumes a standard 45 lb (20 kg) bar and says so. If a weight can't be loaded exactly, it shows the closest load under it.

- Repeat a past workout: tap Repeat on any past day in History. The Log tab lists that day's exercises with the top set's weight and reps and how many sets you did. Start fills them in, and each one counts down as you log. Close it with ×; it clears itself the next day.
- Reps left in the tank: an optional row of chips (0–4+) under To failure. History shows it with the matching RPE, like "2 left · RPE 8". It's included in CSV exports and imports.
- Supersets: turn on "Superset with next exercise" and rest waits until you log the next exercise, then starts as usual. Picking the first exercise again turns the switch back on for the next round. History and the day list show "Superset with …" under each exercise in the pair. Superset links are kept in CSV exports and imports.
- The To failure chips are a little bigger (40 px), easier to tap.
- Fixed: Start on a planned exercise scrolls to the log form again.

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
