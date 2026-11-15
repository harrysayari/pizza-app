# Requirement Coverage: Pizza Dough Planner

**Purpose**: Map every functional requirement (FR-001 to FR-040) to at least one automated test (task T071).
**Checked**: 2026-11-15, after Waves 0 to 4 and the Lane J tests. Unit tests are in `tests/unit/`, end-to-end tests in `tests/e2e/` (Chromium and WebKit).

All 40 requirements have at least one test. Rows marked "added" had no direct test before T071 and gained one. Rows marked "partial" are covered, but a part of the requirement cannot be proven by the suite; the last column says what.

| FR | Requirement (short) | Tests | Notes |
|---|---|---|---|
| FR-001 | Size 12", 14", 16", one tap | `plan.spec.ts` "FR-001: exactly three sizes..." (added); `scenario 2` | added |
| FR-002 | Pizza count 1 to 12, plus and minus | `plan.spec.ts` "FR-002: the stepper stops at 1..." (added), "the stepper stops at 12" | added |
| FR-003 | Tomorrow plus weekday names; Lunch, Early dinner, Dinner | `plan.spec.ts` "offers Tomorrow plus six weekday names"; `schedule.test.ts` bake times | |
| FR-004 | No date picker | `plan.spec.ts` "offers Tomorrow plus six weekday names, never dates" (no `input[type=date]`) | |
| FR-005 | Sentence sets visible, editable choices | `sentence.spec.ts` (scenario 9, "chips stay editable"); `request.test.ts` | |
| FR-006 | Ball weights 280, 310, 350 g | `recipe.test.ts`; `amounts.test.ts` ballGrams; `plan.spec.ts` scenarios 1 and 2 | |
| FR-007 | Total dough = pizzas x ball | `amounts.test.ts` "every size and count"; `schedule.test.ts` 36 combinations | |
| FR-008 | Scale from 1,230 g, no loss | `amounts.test.ts` scaleIngredients (reference grams, 12 x 16") | |
| FR-009 | Whole grams, one decimal under 10 g | `amounts.test.ts` formatGrams; `plan.spec.ts` scenario 2 (1.1 g yeast) | |
| FR-010 | Two groups, tick each ingredient | `plan.spec.ts` scenario 1 and US1.4; `resume.spec.ts` US6.1 | |
| FR-011 | Back-timed schedule, weekday and time, local | `schedule.test.ts`; `plan.spec.ts` scenario 1 | |
| FR-012 | Recipe order and waits, fridge 16 to 24 h | `schedule.test.ts` (fridge window, chain, `minimumLeadMinutes`); `recipe.test.ts` | |
| FR-013 | Too soon: earliest time, one tap, no error | `earliest.test.ts`; `too-soon.spec.ts` (scenario 3, chip labels) | |
| FR-014 | Changes update amounts and times at once | `plan.spec.ts` scenario 2 and US1.2, US1.3 | |
| FR-015 | One step per screen: title, text, amounts, position | `steps.spec.ts` "FR-015: a step shows..." (added), "Back goes to the previous step" | added |
| FR-016 | Countdown for waits of 2 h or less; come-back time for longer | `timer.test.ts`; `steps.spec.ts` "timer controls", scenario 6 | |
| FR-017 | Sound, vibration, "Time is up" | `steps.spec.ts` scenario 4; `timer.test.ts` fires once | |
| FR-018 | No sound before first tap | `steps.spec.ts` "no sound is made before the first tap" | |
| FR-019 | Mute any time, remembered | `steps.spec.ts` "muted", "muted stays muted"; `resume.spec.ts` | |
| FR-020 | Keep screen on by default, tell if refused | `steps.spec.ts` "a refused wake lock...", "keep screen on is requested..." | |
| FR-021 | Alert on return with how long ago | `steps.spec.ts` scenario 5; `timer.test.ts` lateByMs | |
| FR-022 | No promise of alerts on a locked or closed page | `steps.spec.ts` "FR-022: the alert note is shown and no copy promises..." | Checks the step and schedule screens only |
| FR-023 | Calendar file, one event per step, reminder each | `ics.test.ts`; `calendar.spec.ts` scenario 8 (14 events) | Hand-off to the Calendar app on a real phone is a device check (T073) |
| FR-024 | Alarm at the end of each wait | `ics.test.ts` "puts an alarm at the start of an active step and the end of a wait step" | |
| FR-025 | Page from a link, no account or sign-in | Every e2e spec opens `/` cold with no sign-in; `offline.spec.ts` | partial: "no account" is shown by absence, not asserted by a dedicated test |
| FR-026 | Remember plan, ticks, step, timer, mute | `persistence.test.ts`; `resume.spec.ts` US6.1, 6.4, 6.5 | |
| FR-027 | Share link restores size, count, day, time | `share-link.test.ts`; `resume.spec.ts` US6.2 and shared-link cases | |
| FR-028 | Works offline once loaded | `offline.spec.ts` | Production build only |
| FR-029 | No personal data, nothing sent | `privacy.spec.ts` (all three tests, added in T075) | |
| FR-030 | Tap targets 48 px, 8 px apart | `expectTapTargets` in `plan`, `steps`, `too-soon`, `sentence`, `resume`, `shell` and `a11y.spec.ts` on every screen | |
| FR-031 | Text 16 / 18 / 48 px | `expectTextSizes` in `plan.spec.ts`, `shell.spec.ts`, `steps.spec.ts` and `a11y.spec.ts` | chip captions raised to 16 px (T079); `plan.spec.ts` "C2" and `expectTextSizes` check them |
| FR-032 | WCAG AA contrast, light and dark | `expectNoAxeViolations` (both themes) on every screen and state in `a11y.spec.ts`; `build-tokens.mjs` runs 54 contrast checks | |
| FR-033 | Accessible name, focus ring, keyboard and screen reader | `a11y.spec.ts`: names on every screen, focus indicator on every tab stop, keyboard-only plan and first step | Screen-reader speech is not tested; names and roles are |
| FR-034 | No state by colour alone | `a11y.spec.ts` "FR-034" (selected tick, too-soon icon and words, ingredient tick and strike-through, Resting, Paused with bars, Time is up with tick, Done and Now badges) | |
| FR-035 | Reduced motion | `a11y.spec.ts` "FR-035" (mic pulse, timer ball, finished ring) with two controls proving the check can fail | |
| FR-036 | One-handed on about 430 px | `plan.spec.ts` at 360 and 430 px (no overflow, tap and text rules) | partial: see "Observations" on the bottom bar |
| FR-037 | Follow the design system and constitution | `npm run lint` (`check-style.mjs`, no literal colours); `check-budget.mjs` (manifest and icon colours match tokens); axe and size helpers | Component-by-component fidelity is review work |
| FR-038 | New plan and clear data, both confirmed | `resume.spec.ts` US6.6 and US6.7; `persistence.test.ts` clearing | |
| FR-039 | Missing saved data: start screen, shared link restores | `resume.spec.ts` "missing, broken or unknown saved data", "a link with a past or far day..." | |
| FR-041 | Steps in two collapsible parts with hours | `schedule.test.ts` "planParts"; `plan.spec.ts` three "FR-041" tests (hours, open and close, redraw, 48 px, axe) | Added after the first analysis |
| FR-040 | Fixed plan times, updated estimate, minutes ahead or behind | `estimate.test.ts`; `steps.spec.ts` scenario 7 | See "Observations" on an overdue current step |

## Success criteria with automated checks

SC-001 (taps): partly, `plan.spec.ts` defaults. SC-003 and SC-004: `amounts.test.ts`, `schedule.test.ts`. SC-005: `earliest.test.ts`, `too-soon.spec.ts`. SC-006: `steps.spec.ts` scenarios 4 and 5. SC-007: `offline.spec.ts`. SC-008: `a11y.spec.ts`. SC-010: `privacy.spec.ts`. SC-002 and SC-009 need real users and cannot be measured by the suite.

## Observations from the Lane J pass

1. **Bottom bar (FR-036, `layout.md`)**: `layout.md` wants `Done, next step` in a bar fixed to the bottom edge. `src/ui/components/step-card.ts` wraps the buttons in a plain `div` and `design/components.css` has no bar class, so the bar is in normal page flow. `expectTapTargets` (in `tests/e2e/helpers.ts`) treats any two tappable rectangles closer than 8 px as a problem, so a fixed bar over scrolled content would be flagged. If the bar is built, the helper needs to skip a pair when one control is fixed or sticky.
2. **Overdue current step (FR-040)**: `src/domain/estimate.ts` uses the last step marked done plus the planned durations after it. If the current step is overdue and not yet marked done, the estimate stays "On time" until Done is tapped. With nothing done yet it does account for lateness (`max(bakeAt, now + remaining)`). FR-040 says "based on the actual finish times and the remaining waits", so the code follows the text, but it is inconsistent with the nothing-done case.
3. **Restored unstarted plan (edge case "Start time already passed")**: `planFromSaved` in `src/domain/saved.ts` marks a restored plan too soon when no step is done and the bake is less than the minimum lead away. This matches the spec edge case, but a cook who is working through the steps without tapping Done will see the too-soon note on reopening.
4. **14 px captions (fixed, T079)**: size chip captions were 14 px. `.chip-sub` in `design/components.css` is now 16 px, and `expectTextSizes` fails on any `.chip-sub`, `.ing-amount` or `.amount` under 16 px.
5. **Font files**: the build emits and precaches the `latin-ext` and `vietnamese` subsets and the `.woff` fallbacks as well as the Latin `.woff2` files. `design/tokens.json` `type.fonts` lists only the three Latin `.woff2` files the app needs.

## Edge case: largest batch

Over 3,000 g of dough the schedule screen shows a plain note (T078). Tests: `amounts.test.ts` "isLargeBatch", `plan.spec.ts` "C1" (note at 12 pizzas, none at 4 pizzas of 14").
