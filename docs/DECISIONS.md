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
The Log tab's exercise picker is a search box over a list of tappable results, not a native dropdown. A phone's dropdown wheel is slow to scroll through ~600 names and can't show a muscle or equipment line. Search matching ignores case, punctuation and plurals, accepts one typo in words of 4+ letters (two in 7+), and expands a short list of aliases (`ALIASES` in index.html, e.g. RDL ↔ Romanian deadlift). Names rank above muscle and subgroup words. The muscle group filter only sorts results: matches elsewhere still appear under "In other groups", because people often don't know how an exercise is filed. Nothing about stored data changed.
