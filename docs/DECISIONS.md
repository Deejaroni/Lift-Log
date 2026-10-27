# Decisions

Settled choices. Don't reverse one without a new entry saying why.

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
