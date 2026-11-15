# Quickstart: Validating the Pizza Dough Planner

A guide to proving the feature works end to end. The commands below describe the intended project scripts; they exist once the project is scaffolded in the first implementation task. Implementation details are in `tasks.md`.

## Prerequisites

- Node.js 22 or newer and npm.
- A phone (iPhone and Android if possible) on the same network, or a deployed HTTPS preview, for the device checks. Service workers, wake lock and speech need HTTPS or `localhost`.

## Setup and run

```bash
npm install
npm run tokens      # generate design/tokens.css from design/tokens.json
npm run dev         # local dev server
npm run build       # static files in dist/
npm run preview     # serve dist/ the way a host would
```

## Automated checks

```bash
npm run lint        # includes the "no literal colours in src/" rule
npm test            # unit tests: domain, parser, calendar file
npm run test:e2e    # Playwright, mobile viewport, Chromium and WebKit, fake clock, axe
```

Expected: all green. Details of what is covered: see the table below.

## Scenarios

| # | Scenario | How | Expected | Spec |
|---|----------|-----|----------|------|
| 1 | Plan | Choose 14", 4 pizzas, Saturday, Dinner; Make my plan | Ball about 310 g, total 1,240 g, ingredients in two groups, schedule ending at Saturday 7:30 pm, first step Friday evening | US1, FR-006 to FR-014 |
| 2 | Small batch rounding | Choose 12", 1 pizza | Yeast and honey show one decimal (1.1 g); flour shows whole grams | FR-009 |
| 3 | Too soon | Set the fake clock to Friday 6 pm, choose Saturday Lunch | Note with the earliest ready time and a one-tap button; no error | US3, FR-013 |
| 4 | Timer end | Start the 15 min rest, advance the clock 15 min | Sound, vibration where supported, "Time is up" | US2, FR-017 |
| 5 | Locked phone | Start a timer, advance 20 min while hidden, show the page | Alert plays on return with "ended 5 min ago" | FR-021 |
| 6 | Long wait | Open the fridge step | Shows "Come back at ..." and no countdown | FR-016 |
| 7 | Running late | Mark a step done 25 min after its planned time | "25 min behind" and a new ready time; calendar times unchanged | FR-040 |
| 8 | Calendar | Add to calendar | One file with an event per step; wait steps have an alarm at the end | US4, FR-023 |
| 9 | Sentence | Type "four 14-inch pizzas for Saturday dinner" | Four choices set and shown as tags | US5, FR-005 |
| 10 | Resume and reset | Reload mid-plan; then Start a new plan; then Clear saved data | Same screen and step; plan cleared but mute kept; everything cleared | US6, FR-026, FR-038 |
| 11 | Offline | Load once, go offline, reload, plan and follow steps | Everything works | SC-007, FR-028 |
| 12 | Share | Open a shared link on another browser | Size, count, day and time restored | FR-027 |
| 13 | Accessibility | Axe in light and dark; tap-size and text-size checks; keyboard only | No violations; every control 48px or more; text sizes met | FR-030 to FR-036 |

## Device checks (manual, before release)

These are the risks listed in `research.md` and cannot be proven by the automated suite.

1. iPhone Safari: does "Add to calendar" hand the file to the Calendar app? Add the plan and confirm the alarms.
2. iPhone and Android: with Keep screen on, run a 15 min timer to the end with the screen untouched; confirm sound (silent switch on and off) and vibration (Android).
3. Both phones: lock the phone during a timer and confirm the alert on return.
4. Both phones: add the page to the home screen, then use it in airplane mode.
5. Dim kitchen: dark theme at low screen brightness is readable at arm's length.

## Reference

- Data and states: `data-model.md`
- Interfaces: `contracts/` (share link, saved state, calendar file, sentence parser, domain functions)
- Decisions and risks: `research.md`
