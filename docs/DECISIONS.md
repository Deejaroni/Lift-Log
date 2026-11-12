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
The app used to run as a Claude-hosted artifact. The supported copy is now this repo, deployed to GitHub Pages. The leftover code for the old hosted storage was removed on 2026-11-01.


## Exercise search is forgiving and never hides other groups
The Log tab's exercise picker is a search box over a list of tappable results, not a native dropdown. A phone's dropdown wheel is slow to scroll through ~600 names and can't show a muscle or equipment line. Search matching ignores case, punctuation and plurals, accepts one typo in words of 4+ letters (two in 7+), and expands a short list of aliases (`ALIASES` in js/search.js, e.g. RDL ↔ Romanian deadlift). Names rank above muscle and subgroup words. The muscle group filter only sorts results: matches elsewhere still appear under "In other groups", because people often don't know how an exercise is filed. When a search word isn't the start of any word in the library, it is replaced by the closest library word (fewest edits; a guess that changes the first letter needs one edit fewer; whole words beat prefixes; then the word used in more names), and the list says "Showing results for …". This works like a search engine's autocorrect and keeps half-typed typos like "bnc" from emptying the list. Ties in ranking keep the library's order, which lists the most standard version first. Nothing about stored data changed.


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

## Your muscle groups beat the library's
Each exercise's main group and "also works" groups can be set in `settings.exercises`, keyed by lowercase name: `{muscle, also:[...]}`. `groupOf()` checks it first, so History, Progress, Plan and search follow one answer. Saving also rewrites `muscle` on every past set of that exercise, so exports and older code that reads `e.muscle` agree. "Also works" defaults to the other groups the library lists the exercise under. Saved data from before this has no `exercises` object; loading creates an empty one (the migration sits with the other settings defaults in js/state.js).

## Retired exercise names are migrated, not aliased
When the library drops a duplicate spelling, `RETIRED` in js/state.js maps it to the kept name and loading renames it everywhere (sets, plan, muscle settings, a repeated workout) through `renameExercise()`, the same function the rename/merge sheet uses. tests/catalog.spec.js fails if two library names differ only in spacing, punctuation, plurals or word order (direction words like high-to-low excepted).

## Default "also works" muscles come from simple rules
The library lists most exercises under one group, so `SECONDARY` adds the usual partners by main group and name (presses → triceps and shoulders, rows and pulldowns → biceps, squats and lunges → glutes, hinges → glutes and lower back, hammer and reverse curls → forearms). They're defaults only: your own choice in the exercise sheet replaces them. Search and browsing by muscle still follow the library and your own choices, not these rules, so a Triceps search isn't flooded with every bench press.

## Sets per muscle counts secondary muscles as half
The Progress panel counts each logged set once for its main muscle and 0.5 for each "also works" muscle (the common convention for indirect volume), with a drop set counted once and cardio left out. Weeks run Monday to Sunday like the rest of the app. The 10–20 band is a widely quoted hypertrophy range and is labeled as a rough guide, not a target the app enforces.

## The streak is weekly, not daily
Rest days are part of training, so a daily streak would punish doing the right thing. The streak counts weeks in a row (Monday to Sunday) with at least your weekly goal of training days, stored as optional `prefs.weekGoal` (2–6, default 3; older prefs without it get 3). The current week adds to the streak once it meets the goal and never breaks it while in progress. A training day is any day with a logged entry, cardio included.

## The app code is ES modules with an ordered start-up
The code that used to sit inside index.html is split along its sections into ES modules under js/. index.html loads one module, js/app.js, which imports the rest and calls each module's `init()` in the order the code originally ran (ui and state first, main last). The split was converted mechanically, with a JavaScript parser, so behavior stayed identical. How a module is laid out:
- Imports first: each name it uses from another file, imported from the file that declares it.
- Functions, and constants that are plain values (text, numbers, lists, tables, arrow functions), stay at the top level. They can safely be used from anywhere, in any order.
- Everything that runs at start-up (reading saved data, building indexes, hooking up buttons, first render) is inside `init()`. Values it sets are module-level `let`s, so other modules see them through their imports once start-up has run.
- A module can't assign another module's variable, so a value that other files change has a setter in its own file, like `setRestNext()` or `setPrefs()`.
- `export { … }` at the end lists everything the module shares.

Rules that follow: a new file needs an import in js/app.js (with `init` if it has start-up code) and an entry in `FILES` in sw.js. tests/files.spec.js checks that every module is reached through imports and cached, that start-up order begins with ui and state and ends with main, and that code files stay under about 600 lines (exercise-library.js, which is data, is exempt).

## Accent text uses "ink" tokens
Each accent has two tokens: `--red`, `--blue`, `--yellow` and `--green` for fills (buttons, bars, chips, borders, charts), and `--red-ink`, `--blue-ink`, `--yellow-ink` and `--green-ink` for text. The fill shades can't also work as text: yellow on white is 2.5:1, and dark mode's red is too dark to read on dark cards yet too bright for white text on top. Ink shades are darker in light mode and brighter in dark mode, and all pass WCAG AA (4.5:1) on `--surface`, `--field` and `--bg`. Dark mode's `--red` fill moved from #E5484D to #D2353B so white text on it (`--on-accent`) reaches 4.9:1. tests/design.spec.js checks the ratios and fails if a CSS text color uses a fill token or `#fff`.

## Design checks are tools, not tests
`npm run audit:ui` (tools/ui-audit.mjs) screenshots every main screen at 390 × 844 in light and dark with shared sample data (tests/fixtures/demo.js), and measures tap targets, WCAG contrast, screen-reader names, sideways scrolling and non-token colors. `npm run mockup` (tools/mockup.mjs) draws proposed changes with the app's real stylesheet, tokens, font and figure code. Both write to tools/out/, which isn't committed, and neither is part of the app or its offline cache. The audit reports rather than fails, because contrast and layout calls need judgment; once a rule is agreed (like 40 px tap targets), it moves into a test. Screenshot-comparison tests were left out: fonts render differently on Windows and on the Linux publish machine, so they'd need separate reference images for each.

## A size scale for text, spacing and corners
The 2026-11-01 audit found 26 font sizes, 21 spacing values and 8 corner radii, many a fraction of a pixel apart. They were snapped to a scale, and tests/polish.spec.js keeps it that way:
- Text: .75, .85, .9, 1, 1.1, 1.3 and 1.6rem (12, 13.6, 14.4, 16, 17.6, 20.8 and 25.6 px). Big display numbers (1.8rem and up) are set one by one.
- Spacing: even pixel steps (1 px only for hairline offsets).
- Corners: 2 px for thin bars, then 4, 8, 10, 12, 14, and 999 for pills.
A value that falls between steps goes to the nearer one unless that breaks a layout; the stat labels went down to 12 px rather than up, so "Longest (min)" stays on one line.

## Every button has a pressed look
Bordered buttons fill with `--line` while pressed; text-only buttons (Add a note, exercise names, Export) fade to 55%. Log set, the tabs, the steppers and list rows keep their own pressed styles. tests/polish.spec.js fails if any visible button on the main screens has no `:active` rule.

## Slow redraws wait for the next frame
After Log set, `renderAll()` redraws everything that depends on your sets. The exercise list and History are the two slow parts (about 30 and 40 ms on a mid-range phone) and usually aren't on screen when you log, so `soon()` in js/ui.js draws them just after the next frame, unless you're looking at them (the History tab is open, or you're typing in the exercise search). Several calls before then draw once. Log set went from about 190 ms to about 30 ms from tap to screen. The UI audit times taps with the browser's Event Timing (press to next frame), the same measure as Core Web Vitals' INP, so work put off until after the frame doesn't count.

## The Log form puts once-per-exercise settings first
Equipment, the lateral raise details and "Superset with next exercise" sit under the exercise search, above the set type, instead of under the reps. You set them once per exercise, while weight, reps and Log set are tapped every set, so these now sit together at the bottom of the form, closer to your thumb. A sticky log bar above the tabs was the other option; it was left out as the bigger change.

## What the UI audit measures beyond usability
The audit also looks at how the screens hold together and feel, not just whether they pass the rules:
- **Edge cases:** besides the sample data it opens a first launch (no data), long names and big numbers in kg (`stress()` in tools/audit/scenarios.mjs), and text at 130% and 200%. Larger text is browser zoom (a narrower page drawn bigger, so small-screen layouts apply), the way Chrome on Android applies its text size setting. It flags text cut off, text spilling out of its box, and items that overlap. Edge cases list only what the sample data didn't already show.
- **Layout:** edges 1 to 3 px off an edge three or more others share, and text closer than the 16 px page margin to the screen edge.
- **Sizes in use:** every font size, weight, corner radius, spacing value, shadow and transition on the sample-data screens. A value used by one kind of element, or within a pixel of a more common one, is marked as a candidate to snap to a standard size. These are notes, not issues.
- **Feel:** controls with no `:active` style (no pressed look), things that move after a screen opens, things still moving with reduce motion on, and tap-to-next-frame times with the CPU slowed 4× to stand in for a mid-range phone (100 ms is the aim for taps). Speed numbers vary by a few tens of ms between runs.
- **Thumb reach:** a map over the Log tab of where the most-used controls sit for a right thumb. The zones are the tool's own rough estimate, not a standard.
- **Wording:** labels that aren't sentence case (names, abbreviations, muscle groups, screen names and the exercise library's own capitals are allowed) and the same thing said two ways ("delete" and "remove").
- **Changes since last run:** each run compares its screenshots with the previous run's and shows what changed in red. To keep them comparable, the audit runs on a fixed day (2026-03-04), waits for fonts, and takes screenshots with reduce motion on so the exercise pictures hold still.

## The publish workflow is pinned to Ubuntu 24.04
GitHub is moving `ubuntu-latest` to Ubuntu 26 (from 2026-10-19). The tests install Chromium with `npx playwright install --with-deps`, which needs Playwright to know the operating system's packages, so a silent switch could break publishing. Both jobs run on `ubuntu-24.04` (supported into 2029) until Playwright lists Ubuntu 26.04 as supported. The actions are on their Node 24 versions (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5), and the tests run on Node 24 to match local development.

## Exercise animations are drawn by code from key poses
Each movement pattern in js/movements.js is a start pose and an end pose (joint positions), its equipment, its muscle bands and three steps; js/figure.js draws the figure for any moment between the two as SVG, and js/visuals.js picks the pattern for an exercise and runs one animation loop for whatever is on screen. About 45 patterns cover roughly 85% of the library, so every bench press variant shares one figure with the right weight in hand (bar, dumbbell, kettlebell or cable). Drawing from poses keeps it tiny, offline, original artwork (no image licenses) and themed by the app's color tokens, so it follows light and dark mode.
- Patterns are matched by `RULES` (regexes over "muscle|subgroup|name", first match wins). An exercise with no pattern shows the body map instead; tests/visuals.spec.js fails if more than 5% of strength exercises have none (raised from 15% when the second set of patterns landed).
- Later patterns (forearms, obliques, calisthenics, kettlebell, cardio machines) live in js/movements-more.js to keep files under about 600 lines. movements.js passes its shared poses and bands in (`morePatterns({B, STAND, PATTERNS})`) rather than the new file importing them, which would be a circular import. Many of its poses are built from each body part's angle (`bod`) or by reaching a hand or foot to a point (`ik`) instead of typed-in joint positions, which made lying and upside-down poses practical.
- Front-view figures can lean sideways (`lean`, degrees about the hips) for side bends and cable chops; the arms are given already tilted so the hands land where the weight or cable is.
- Cardio machines (bike, treadmill, rower) get a picture but no highlighted muscles, matching how cardio has no muscle groups elsewhere. The bike and treadmill give a pose for any moment (`pose(t)`) and loop continuously every 1.6 s, since pedalling and walking go round rather than out and back. They aren't listed in Browse by movement, which is for finding lifts.
- A movement can set its own speed: `loop` in ms for a slower circle (the halo, 3.2 s), or `period` for a longer out-and-back (the Turkish get-up, 7.2 s). The get-up runs through four key poses in order (`seq`), and plays them in reverse on the way down, which is also how the real get-up goes.
- The Russian twist is a seated front view: the whole figure is moved down (`shift`) and the knees are drawn over the torso (`legsFront`). A plain Russian twist holds nothing; the weighted one holds a plate.
- The seated hip abduction and adduction machines are a front view with the thighs toward you. The app has no adductor muscle group, so the adduction machine is filed under Quadriceps (as custom adductor exercises already were) and its picture lights the inner thighs.
- "Full body" isn't a muscle the figure or body map can show, so a full-body exercise lights up every muscle its movement shows (the get-up: front delts, triceps and abs).
- What's highlighted follows the app's own muscle data (`groupOf`, `alsoOf`, including your edits): main muscle solid red, supporting muscles at 38%. Delt heads come from the library's "Front/Side/Rear delts" subgroups, or the pattern when there isn't one, so a lateral raise lights only the side delts.
- The figure is a light body with an outline so red reads clearly in both modes. A muscle the camera angle hides (rear delts in a side view) still shows on the body map.
- One requestAnimationFrame loop at about 30 frames a second animates figures that are on screen and stops when there are none. With "reduce motion" on, figures show a still of the end position.

## "Recently used" favors 2–3 days ago
The same lifts rarely come back on consecutive days (a Monday usually repeats Friday or Saturday), so plain most-recent-first put the wrong exercises on top. The picker ranks by how long ago each exercise was last done, counted from the Log form's date: done that day first (you may be logging another set), then 2–3 days ago, then 4+ days, and yesterday last. Within a band, most recent first. Yesterday's are moved to the end rather than hidden so a new user, or a narrow muscle group, still sees something. Only the picker uses this order; other lists keep plain most-recent order.

## Bodyweight standards count weighted sets and harder versions
The push-up, dip and pull-up tiers are reps in one set. A set with added weight, or of a harder version of the same move (diamond, decline, archer, clap or ring push-ups; ring or weighted dips; wide or close-grip pull-ups), means you could do at least that many plain reps, so it counts as a lower bound. Easier or different moves don't count: knee, incline, pike and handstand push-ups, bench dips, assisted and machine versions. Exercise names match without case, spaces, hyphens or a plural "s", so a custom "Pushups" counts as "Push-up". Before this, only the exact plain name with no added weight counted, so someone doing weighted dips saw "Not logged".

## Achievement badges
js/badges.js works every badge out from logged entries each time; nothing new is stored, so there is no migration. It keeps an index of each exercise's entries, rebuilt when entries are saved (`rev` in js/state.js counts saves) or the unit changes, so History doesn't re-sort everything for each day.
- An exercise shows at most two badges: its top milestone, then its top record (the mockup's "up to two" option, chosen 2026-11-04). Records, in order: PR (est. 1RM), Heaviest (most weight, any reps), Rep PR (more reps than any earlier set at that weight or heavier), Volume PR (the exercise's weight × reps for the day). Milestones, in order: Tier up, plates, body-weight multiple, Back, New. A record needs an earlier session to beat, so a first session is just New.
- Plates assume a 45 lb bar and 45s (20 kg bar and 20s in kg) and only count barbell exercises other than the EZ bar, using the set's equipment or, if none, the equipment its name suggests.
- Tier up and body-weight multiples use each set's own day's body weight, like the strength standards, and only fire when an earlier set had a body weight to compare with. Tier up needs standards chosen on Progress and says it's the app's estimate.
- Cardio: Longest compares distance when both sessions have one, else minutes. Fastest only compares sessions at least 90% as long, so a short sprint can't beat a long run's pace.
- Day badges: Biggest day is the most strength volume on any day so far (cardio doesn't count). Workout counts mark the 10th, 25th and every 50th day with anything logged.

## "Build your own" is a six-question quiz
js/plan-quiz.js asks for goal, where you train, training days, experience, workout length and up to two focus areas, then builds a normal program (same shape as a template) and opens it in the plan editor. There's no separate preview: the editor is where you review and change it. The templates are unchanged.
- Split from the number of days: 2–3 full body (A/B or A/B/C; an experienced lifter building muscle on 3 days gets push / pull / legs), 4 upper / lower, 5 upper, lower, push, pull, legs, 6 push / pull / legs twice. Workouts go on the chosen days in order. Days are limited to 2–6 so there's always a rest day.
- Exercises come from slots (squat, hinge, horizontal push…), each with a machine choice for new lifters and a free-weight choice otherwise; "Get stronger" uses the barbell lifts. Workout length sets the count (30 min 4, 45 min 5, 60 min 6, 75+ min 7). Lose fat ends each workout with a 15-minute incline walk and Stay fit with 10 minutes; the walk counts toward the total. Each focus area adds one exercise to the shortest workout that trains it. tests/plan-quiz.spec.js checks every answer combination only uses library names.
- Where you train: Full gym, Home: dumbbells (dumbbells and a bench) or Home: body weight. Each has its own exercise list per slot; a slot with nothing that fits at home (cable or machine isolation moves, curls at body weight) is skipped and the workout fills up from a list of filler moves (core, calves, glutes, single-leg work) so it still has the planned number of exercises. Get stronger only swaps in barbell lifts at a gym. The cardio finisher is an incline treadmill walk at a gym and a walk at home. Body weight assumes nothing but a pull-up bar for experienced lifters (pull-ups, chin-ups), so pull days are thinner there. Answers saved before this question count as a full gym.
- Reps: Get stronger puts the first lift at 4–6 (5–8 new, 3–5 experienced) with an extra set, 6–10 for other compound lifts; Build muscle 8–12 (6–10 experienced) and 10–15 for isolation; Lose fat 10–15; Stay fit 8–12. New lifters get 2 sets, others 3.
- The answers are saved with the program (`program.quiz`, `template: "quiz"`) so Change answers starts from them. It's a new optional field, so older saved programs need no migration; the test "programs saved before the quiz still open as they were" loads an old empty "Build your own" program (template `__blank`), which still opens in the editor.
- The number of training days doesn't change the weekly goal on Progress; that stays its own setting.

## Faster logging (roadmap phase 1)
The plan for the next updates is in docs/ROADMAP.md.
- Next-set suggestion (js/suggest.js) is a chip you tap ("Use"), not a prefill: the form keeps last time's numbers so logging what you planned is never overridden. It needs at least 2 earlier sessions and skips cardio, drop sets and plain bodyweight. If the exercise is in the day's planned workout, the plan's own suggestion (range, progression, deload) is used, so the chip and the Plan card always agree. Otherwise it goes from the last session's top weight: every set at that weight reached the first set's reps → +5 lb (2.5 kg), +10 lb (5 kg) for lower body; any set short → stay; more than 4 weeks since → about 10% lighter. The chip hides once the form matches it.
- "Last" lists the whole last session before the form's date in order, grouping runs of the same weight ("135 × 8, 8, 7 · 155 × 3"). With no earlier session it shows what's already logged that day.
- Repeat last set copies the most recent straight set logged on the form's date, with its equipment, reps left and note, but not failure or a superset link. Because the form resets after every log, it repeats the day's last set rather than the chosen exercise's, and hides when a different exercise is chosen.
- Today's sets on the Log tab: the whole row opens the editor and Delete lives inside it (with Undo as before). History keeps the ··· menu because it's for reading. The editor covers weight, reps, failure, reps left, equipment and note, with exercise and date under More since they rarely change. Converting a straight set to a drop set isn't offered; delete and log it again. The equipment toggles and fields are the Log form's own (js/equipment.js renders them from any state object), so the two can't drift apart. No stored-data change: the editor writes fields sets already have.
- The keyboard bar shows only when the on-screen keyboard is up (the visual viewport is more than 120 px shorter than the window), so it never covers the page on a computer. iPhone number pads have no Return key, so the bar's Next is how you get from weight to reps there; Enter does the same where there is one.
- The date and muscle group fold into one line because they rarely change; the line closes again when the form resets after a log.

## Picking exercises (roadmap phase 2)
- Favorites are a list of names in settings (`settings.favs`), so they're in backups and follow renames. Older saved settings have no list; state.js starts it empty (tests/picking.spec.js loads old settings). In the picker they come first, limited to the picked muscle group like Recently used, and aren't repeated under Recently used. The chosen card shows ★ after the name rather than a star button, which squeezed the name at 390 px; you star it from the picker or the how-to sheet.
- Today's row lists exercises logged on the form's date in the order you first did them, then planned exercises not started (dashed). It's hidden until something is logged that day, since the Plan card already lists the plan. A planned exercise shows "2 of 3", with ✓ when done.
- Next in your plan: when a log finishes an exercise's planned sets, the form resets and picks the next planned exercise that isn't done (after it in the plan, then from the top), filled in from the plan. The muscle group stays at All, so the form still resets as usual. It doesn't happen when the set starts a superset, since you're about to log its partner.
- Search shows every match you've logged under Yours, then the library's best 8 (Show all for the rest), then other muscle groups. The shorter list made one ranking gap matter: a short name for an exact exercise ("rdl" for Romanian deadlift) now ranks that exercise first, ahead of names that merely contain the word.

## Motion and feedback (roadmap phase 3)
- Everything is 150–250 ms and nothing waits for it: you can tap again mid-motion. The existing rule in css/app.css turns all animation and transitions off when the phone asks for reduced motion, and the JS motion (tab glide, count-up) checks the same setting. "✓ Logged" still shows then, without fading, because it's feedback, not decoration.
- Only what's new moves. The day list remembers the entries it last showed for that date, so after a log only the new rows slide in, only their exercise's total counts up (from the old number, under 10,000 so "10.5k" never ticks) and only badges that weren't there before pop. Opening the app, switching days or opening an editor redraws without motion. The header ring does the same for a segment that just finished.
- The tab pill is a separate element that glides from the old tab's place to the new one, then hides, leaving the tab's own red. At rest the tab bar is exactly as before, so its colors and tests didn't change.
- Sheets, dialogs and Settings slide up as they open. They close without motion: closing hides them immediately everywhere in the code, and delaying that for an exit animation risked a hidden sheet still catching taps. Cards and sections that open (Equipment, note, the date line, editor sections) fade down into place; their height still changes at once.
- Rest end: the button already turned green; now it also pulses twice and the Log tab flashes a green ring. The chime already played (it isn't new); Settings → Rest timer has a switch for it, on by default so nothing changes unless you turn it off. It's saved per phone (prefs.chime). iPhone web apps can't vibrate, so the visual cue carries it there.

## History browsing (roadmap phase 4)
- Last time on the Log tab is the most recent session before the form's date, so it doesn't change as you log today. It starts folded to one line (date and best set: best est. 1RM among sets of 10 reps or fewer, else the heaviest), and stays open or folded as you switch exercises. Open, it lists sets in order with failure and reps left, drop sets as one line, then the equipment and notes. Tapping a straight set copies its weight and reps; drop sets don't, since the form's drop builder is separate.
- History's dropdown became two buttons. The select itself is still in the page, hidden, and holds the chosen exercise, so everything that already set or read it (Progress's calendar, tests) keeps working.
- The Day calendar shows the days in History's current list, so with one exercise chosen only its days are tappable. It opens on the month of the latest day shown and closes when you pick a day.
- The one-exercise summary uses the same rules as elsewhere: best set and est. 1RM from sets of 10 reps or fewer, load including the bar. Cardio shows sessions, longest and total time instead.
- The picker lists only exercises you've logged (there'd be nothing to show for the rest): favorites first, then most recent.

## 3D figures: the body (prototype, 2026-11-12)
- The 3D body is the MakeHuman base mesh (released as CC0, so no attribution or license terms carry into the app), shaped into a young adult man with MakeHuman's own targets. Bodies built from simple shapes in Blender kept reading as mannequins. The source mesh, the targets used and the CC0 text live in tools/model/makehuman/; tools/model/build-body.py turns them into models/body.glb. Nothing is downloaded at runtime.
- The build poses the body into a T-pose with palms down and thumbs forward, because the app's poses and palm turning assume that rest pose.
- Worked muscles are shown by per-vertex muscle maps (soft oval patches shaped and placed like each muscle), not by coloring whole regions; one material blends the highlight in, so the body is a single draw per view. Each patch covers the whole muscle with a crisp outline and a short fade. Main muscles are red and helping muscles yellow (from the color tokens), each with a faint glow so they read at thumbnail size. The floor shadow uses the --shadow token, so it stays dark in dark mode.
- Fingers have bones and close around the bar or handle in the app, since every exercise shown holds something; open hands looked like waving.

## 3D figures in the app (2026-11-12)
- Every movement pattern in js/movements.js has 3D key poses with the same key, in js/poses3d.js and js/poses3d-more.js. The 2D patterns still own the matching rules, titles, steps and muscle bands, and the 2D drawings remain the fallback where WebGL isn't available (or three.js fails to load).
- Poses are directions per body part, not joint positions, so the same pose fits the body at any size. Arms are written relative to the chest, so they lean with the torso. Where a bar must follow a set path (squat on the back, bench, overhead press, pulldown), the hands reach for it with two-joint IK. When only one side moves, the other side is written out too (a left-only pose would otherwise mirror to the right).
- Equipment comes from the kind of weight in the exercise's name (bar, one per hand, one in both hands, one hand only, plate, cable handle) unless the pattern fixes it; cable patterns name their pulley so the cable runs to the right place. Patterns that differ by equipment (a dumbbell fly lies on a bench; a cable fly stands) point to their own poses.
- three.js and the body load only when the first picture is needed (or when the app goes idle), via an import map, so start-up isn't slowed. Small pictures run at about 30 frames a second, the how-to picture at the screen's rate; everything off screen pauses. Reduce motion draws each picture once, holding still.
- Small pictures show the 2D drawing underneath until the first 3D frame lands, so lists never flash empty.
- The body map and the legend in the how-to sheet use the same colors as the 3D body: red for the main muscle, yellow for helpers.
- three.js is shipped unminified (npm no longer publishes minified builds and the app has no build step). GitHub Pages compresses it in transit; the offline cache holds it once.
- 19 of the 561 strength exercises still have no movement picture (grip holds, hangs, slider curls and a few bodyweight moves). Mapping them to the nearest pattern would show the wrong movement, so they keep the body map until they get their own.
