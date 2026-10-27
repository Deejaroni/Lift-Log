# Lift Log

Personal workout journal: a home-screen web app (PWA) for phones, hosted on
GitHub Pages. Used daily at the gym, often one-handed, often in dark mode.

## Hard rules
- Plain HTML, CSS and JavaScript modules. No framework, no build step.
- Works fully offline: no network calls at runtime. Third-party code lives in
  /vendor (Chart.js 4.4.1); fonts are local.
- Data lives in the browser (localStorage). No accounts, server or API keys.
- Never rename the storage keys liftlog.entries.v1, liftlog.settings.v1 or
  liftlog.prefs.v1. Any change to stored data needs a migration in
  js/state.js plus a test that loads old-format data.
- Never use alert(), confirm() or prompt(); use the dialogs in js/ui.js.
- Add every new app file to the cache list in sw.js.
- Leave __BUILD__ in sw.js and js/version.js; the publish workflow fills it in.

## Design
- Must work at 390 px wide, in light and dark mode. Colors come from the
  tokens in css/app.css; never hard-code them.
- Font: Archivo (variable, self-hosted; use font-stretch for condensed text). Accents: plate red, blue, yellow, green.
- Tap targets at least 40 px. Short, plain wording in sentence case.
- After any entry is logged, the Log form resets (muscle group: All).

## The math (keep consistent everywhere)
- Load = entered weight, plus the bar when Smith machine or Barbell is set to
  "Plates only (bar added)".
- Volume = load x reps, x2 for one-side sets or two implements "per hand/bell";
  never x4.
- Est. 1RM = load x (1 + reps/30); rankings use sets of 10 reps or fewer.
- Calories: MET x body weight (kg) x hours. Cardio prefers watts, then
  speed/incline (ACSM), then effort. Body weight = that day's record, else
  the latest earlier one.
- DOTS uses the published coefficients in js/standards.js; age adjustment is
  +1% per year past 40. Strength tiers are the app's own estimates; label
  them that way.

## How to work
- Read only the files a change needs; keep files under about 600 lines.
- Write or update a test in /tests before changing behavior. Run npm test
  before every commit.
- Check changes at a 390 x 844 viewport, in light and dark mode.
- Small commits with plain-English messages. Log visible changes in
  docs/CHANGELOG.md and the reason for non-obvious choices in docs/DECISIONS.md.
- Ask me before adding a library, network call or analytics, or when unsure
  how something should look or behave.

## Commands
- npm test       all tests (Playwright, headless Chromium, phone size)
- npm run serve  local copy at http://localhost:8080
- /ship          test, changelog, commit, push, watch the publish
