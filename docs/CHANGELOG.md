# Changelog

Newest first. One entry per deploy. Describe what users notice, not how the code changed.

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
