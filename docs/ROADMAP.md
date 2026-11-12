# Roadmap

Agreed 2026-11-11. Built for both daily use and new people. Motion is quick
and subtle (about 150 ms, nothing that slows you down). Most users are on
iPhone, so there is no vibration; feedback is visual, plus an optional sound.
Each phase ships as its own update, with a phone mockup approved first.

## 1. Faster logging
- Tap a set in today's list to edit it in place: weight, reps, and its
  details (to failure, RIR, equipment and attachments, set type, note).
  This replaces the ··· menu for editing.
- Repeat the last set in one tap.
- Keep the weight and reps boxes, but make them easier to use: bigger targets,
  the keyboard never covers Log set, and Next moves from weight to reps.
- Tidier form: the date and the muscle group filter fold into a compact line
  that opens when tapped.
- Next-set suggestion as a chip ("Try 140 × 8") with a short reason, based on
  history and, for planned exercises, the plan's rep range and progression.
  The form keeps last time's numbers until the chip is tapped.

## 2. Picking exercises
- Favorites: star an exercise; starred ones come first in the picker.
- A row of today's exercises above the form to switch back and forth.
- Next in my plan: after the last planned set of an exercise, the next one is
  picked for you.
- Search: exercises you've logged rank first, and the list is shorter.

## 3. Motion and feedback
- Logging a set: the set slides into today's list, the header ring segment
  fills, numbers count up.
- Tab changes cross-fade; sheets and dialogs slide up; cards expand smoothly.
- PR and other badges pop in with a small scale-up.
- Rest end: the Log button and timer pulse; optional soft beep while the app
  is open (off by default, switch in Settings).
- Everything respects the phone's reduce-motion setting.

## 4. History
- "Last time" on the Log tab: every set from the previous session of the
  chosen exercise, not just the top one.
- Calendar jump to any day.
- Filter by exercise: only the days with it, with its sets.

## 5. Body and goals (new Body section on Progress)
- Body weight chart with a smoothed trend and a weekly rate.
- Measurements (waist, chest, arms and so on), each with a trend.
- Progress photos stored on the phone (IndexedDB), with side-by-side
  comparison. Included in the one backup file, which gets much bigger.
- Lift goals ("Bench 225 lb by June") with a progress bar and projected date,
  shown on each lift card.
- Needs a stored-data migration and an old-format test (see CLAUDE.md).
