# Decisions

Settled choices. Don't reverse one without a new entry saying why.

## Archivo replaces Barlow
Chosen 2026-10-27 for the visual refresh. Archivo has a width axis, so one family covers both body text and the narrow, heavy numbers that Barlow Condensed used to provide, and its tabular figures keep weights and reps from shifting as they change. It's under the SIL Open Font License and is self-hosted in `fonts/` like Barlow was.

## No build step
The repo is the app. `index.html`, `sw.js`, `manifest.webmanifest` and the files they reference are served exactly as committed. The only change at deploy time is replacing the `__BUILD__` version placeholder. Dependencies are vendored (`vendor/`, `fonts/`) instead of bundled or loaded from a CDN, so the app works offline.

## Data stays on the device
There are no accounts and no server. Entries, settings and preferences live in the browser's `localStorage` on each phone. CSV export and import cover backups and moving to a new phone. Import must never create duplicates (it matches on entry id).

## Smith machine adds the bar by default
On a Smith machine, the weight you enter is treated as plates only and the bar weight is added on top ("Plates only (bar added)"). A barbell defaults to "Total, including bar". Both can be changed per entry.

## One-side sets count double
A set marked "One side (unilateral)" is logged as reps for one side, and volume counts both sides (×2). Two dumbbells with "Weight is per hand", or two kettlebells with "Weight is per bell", also count ×2.

## In-app dialogs only
Confirmations and messages use the app's own dialog (`#dlg`), never `alert`, `confirm` or `prompt`. Browser pop-ups were blocked where the app used to be hosted, and they look out of place in an installed PWA.

## The Claude-hosted copy is retired
The app used to run as a Claude-hosted artifact. The supported copy is now this repo, deployed to GitHub Pages. Leftover code for the old hosted storage (the `col` / `backend === "db"` branch in `saveSettings`) never runs and can be removed.


## Exercise search is forgiving and never hides other groups
The Log tab's exercise picker is a search box over a list of tappable results, not a native dropdown. A phone's dropdown wheel is slow to scroll through ~600 names and can't show a muscle or equipment line. Search matching ignores case, punctuation and plurals, accepts one typo in words of 4+ letters (two in 7+), and expands a short list of aliases (`ALIASES` in index.html, e.g. RDL ↔ Romanian deadlift). Names rank above muscle and subgroup words. The muscle group filter only sorts results: matches elsewhere still appear under "In other groups", because people often don't know how an exercise is filed. When a search word isn't the start of any word in the library, it is replaced by the closest library word (fewest edits; a guess that changes the first letter needs one edit fewer; whole words beat prefixes; then the word used in more names), and the list says "Showing results for …". This works like a search engine's autocorrect and keeps half-typed typos like "bnc" from emptying the list. Ties in ranking keep the library's order, which lists the most standard version first. Nothing about stored data changed.


## Updates wait until you choose to reload
Each version of the app serves its page and its files from its own cache, so an open app never mixes an old page with new styles (or the reverse). A new version downloads in the background (bypassing the browser's own cache, so it never stores stale copies) and waits. The app shows a "new version ready" note with Reload; otherwise it switches over when the app is fully closed. Reloading on its own could throw away a half-entered set, so it's always your tap.

## Backups are one JSON file
"Back up everything" saves sets, settings (plan, body weight log, profile) and preferences together as JSON, because the CSV only holds sets. Restore merges sets by id so nothing is duplicated, and asks before replacing the plan and settings. The CSV export stays for spreadsheets. The last backup date and a "Later" snooze date are stored as optional fields in `liftlog.prefs.v1` (`lastBackup`, `backupSnooze`); older saved data without them simply counts as never backed up, so no migration is needed.

## Delete uses Undo instead of a confirmation
Deleting is instant and shows an Undo note for 8 seconds. A confirmation adds a tap to every delete and is easy to tap through on autopilot; Undo is faster mid-workout and still recovers mistakes. Deleting a workout or a whole program still asks first, since those take more to rebuild.

## Effort is entered as reps left in the tank
Each set can carry an optional `rir` (reps in reserve, 0–4, where 4 means 4 or more). Counting reps you could still do is easier mid-set than judging a 1–10 RPE, and the two map directly (RPE = 10 − reps left), so History shows both. One choice applies to all sets logged together; drop sets and cardio don't use it. Older entries simply have no `rir`, so no migration is needed. It isn't used by Plan progression yet.

## Supersets only change when rest starts
A superset is marked on the sets themselves: `ss` (a shared id) on every set in the group, and `ssLead: true` on sets logged with the switch on. Logging with the switch on skips the rest timer; the next set logged (any exercise) joins the group, and rest starts after it. The Log form still resets after every set, so you pick each exercise yourself; picking one that led a superset earlier today turns the switch back on. We chose this over switching the form to the partner exercise automatically, to keep the form-reset rule. Older entries have no `ss`, so no migration is needed.
