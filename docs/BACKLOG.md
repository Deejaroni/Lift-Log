# Backlog

Ideas and requests not yet built. Newest at the bottom. Move an item to docs/CHANGELOG.md when it ships.

## Visual refresh: more modern look
Added 2026-10-27.
- Cleaner layout: more consistent spacing and alignment across tabs.
- Crisper cards and buttons: sharper edges, borders and shadows, clearer pressed states.
- Keep the existing color scheme (light and dark), just refined.
- Sharper fonts: crisper text rendering, and possibly a different self-hosted font in place of Barlow / Barlow Condensed.
- Decided 2026-10-27, from side-by-side previews: full redesign, not polish.
  - Font: Archivo everywhere (text and numbers), self-hosted, replacing Barlow and Barlow Condensed.
  - Log tab: a "Today" header with a ring split into one segment per planned exercise (done = ink, current = red, rest = line), and "Next: <exercise>". No plan that day: hide the ring, show just the date.
  - Steppers: −/+ on either side of a large number, quick-add chips (+2.5, +10, +45) underneath, "Last time" hint.
  - Rest timer: the Log button becomes the countdown ("Resting 1:12 · tap to log") with a +30s button beside it.
  - Plan tab: list of training days only; today's card is outlined in red and expands to show its exercises.
  - History tab: one card per exercise with a bar per set, top set in red, PR badge, volume and est. 1RM.
  - Progress tab: one card per lift with the big est. 1RM, 30-day change, trend line and the strength tier ladder (labeled as the app's own estimate).
  - Tab bar: floating pill with the active tab in red. Light mode uses ink; dark mode uses the muted gray (--muted) so it isn't too bright.
  - Every tap target 40 px or more, including the quick-add chips.

## Gaps review: next items
Added 2026-10-31. Items 1–3 of the review (update handling, full backup, undo) shipped 2026-10-31. Do these in order:
- Keep the screen on while resting or logging (Wake Lock).
- Plate calculator: plates per side for the entered weight, using the bar setting.
- Repeat a past workout: start today from the last time you did that day, weights and reps filled in.
- Supersets: link two exercises so rest starts after the second.
- Change an exercise's muscle group (History and Progress follow), and secondary muscles (e.g. hip thrust counts for Glutes and Hamstrings). Needs a migration and an old-data test.
- Clean up the built-in exercise list (wrong groupings, near-duplicates) and merge your own duplicates.
- Weekly sets per muscle group.
- Consistency calendar or streak.
- Split index.html into modules (it's ~3,300 lines; CLAUDE.md refers to js/state.js, which doesn't exist yet).
- Publish workflow: move off deprecated Node 20 actions and check the Ubuntu 26 runner change.
- Dropped 2026-10-31: RPE / reps in reserve per set.
