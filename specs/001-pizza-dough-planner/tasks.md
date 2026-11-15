---

description: "Task list for the Pizza Dough Planner"
---

# Tasks: Pizza Dough Planner

**Input**: Design documents from `/specs/001-pizza-dough-planner/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md. Constitution v1.1.0 applies to every task.

**Tests**: Included. Constitution principle IV requires tests for each acceptance scenario, written first and seen failing before the code that satisfies them.

**Organization**: Tasks are grouped by user story (US1 to US6, in the spec's priority order) so each story can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: the user story the task belongs to (US1 to US6)
- All paths are relative to the repository root `/Users/harrysayari/Code/pizza-app`

## Conventions for every task

- All colours, spacing, type, motion and tap sizes come from `design/tokens.css` and `design/components.css` (constitution I). No hex or `rgb()` colour literals under `src/`.
- Domain code (`src/domain/`) is pure: no DOM, no storage, no real clock. Pass `now` or a `Clock` in (constitution III, IV).
- Class names for components come from `design/components.css`. Copy the exact markup for each component from `design/reference/components/<Name>/preview.html`, and follow that folder's `README.md` rules. Layout, copy, motion and the constitution rules are in `design/reference/layout.md`, `copy.md`, `motion.md` and `rules.md`. The design system page is https://claude.ai/artifact/LWTbnj9szeRfNF2Q2QvSeM.
- Every storage and browser-feature call is wrapped in try and catch and must degrade quietly.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialisation and tooling.

- [x] T001 Create the folder structure from plan.md: `src/domain/`, `src/state/`, `src/platform/`, `src/ui/screens/`, `src/ui/components/`, `src/styles/`, `scripts/`, `public/icons/`, `tests/unit/`, `tests/e2e/`, adding an empty `.gitkeep` where a folder would otherwise be empty
- [x] T002 Create `package.json` (private, `"type": "module"`) and `tsconfig.json` (`strict: true`, target ES2022, `noUncheckedIndexedAccess: true`, include `src` and `tests`). Add scripts: `dev` (vite), `tokens` (`node scripts/build-tokens.mjs`), `predev` and `prebuild` (run `tokens`), `build` (vite build), `preview` (vite preview), `lint` (`tsc --noEmit && node scripts/check-style.mjs`), `test` (vitest run), `test:e2e` (playwright test)
- [x] T003 Install dev dependencies and commit the lockfile: `vite`, `typescript`, `vitest`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `@fontsource-variable/fraunces`, `@fontsource/atkinson-hyperlegible`. Add no runtime dependencies. Run `npx playwright install chromium webkit`
- [x] T004 [P] Create `vite.config.ts` with `test: { environment: 'jsdom', include: ['tests/unit/**/*.test.ts'] }`, build output `dist/`, and an empty `precacheList()` plugin stub to be filled in T063
- [x] T005 [P] Create `playwright.config.ts`: projects `chromium` and `webkit` with a 390 × 844 mobile viewport and touch enabled, `testDir: 'tests/e2e'`, and a `webServer` that runs `npm run build && npm run preview` on a fixed port
- [x] T006 [P] Create `index.html` at the root: `lang="en"`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<title>Pizza Dough Planner</title>`, `<meta name="theme-color">`, `<link rel="manifest" href="/manifest.webmanifest">`, a `<div id="app">`, and `<script type="module" src="/src/main.ts">`
- [x] T007 [P] Create `scripts/check-style.mjs`: fail with a non-zero exit and a file and line list if any file under `src/` (css, ts) contains a hex colour (`#[0-9a-fA-F]{3,8}\b`), `rgb(`, `rgba(`, `hsl(` or `oklch(` literal (constitution I). Wire it into `npm run lint`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core pieces every user story needs. No story work begins until this phase is done.

**⚠️ CRITICAL**: Complete this phase first.

- [x] T008 [P] Create `src/domain/recipe.ts` exporting typed constants copied exactly from data-model.md. Sizes and ball weights: `12 → 280`, `14 → 310`, `16 → 350` (grams). Time choices: `lunch` 12:30, `early` 18:00, `dinner` 19:30. Eight ingredients with ids, group (`Poolish` or `Final dough`), name and reference grams: `p-water` 200, `p-honey` 5, `p-yeast` 5, `p-flour` 200, `f-manitoba` 300, `f-flour` 200, `f-water` 300, `f-salt` 20 (total 1,230). Fourteen steps with id, title, instruction text taken from `specs/001-pizza-dough-planner/recipe-source.md` and written in the voice of `design/reference/copy.md`, kind (`active` or `wait`), planning minutes (3, 15, 60, 1080 default with range 960 to 1440, 60, 5, 5, 15, 10, 15, 5, 60, 10, 90 with range 60 to 120) and the ingredient ids each step uses. Export a `isLongWait(step)` helper: true when a wait exceeds 120 minutes
- [x] T009 [P] Create `src/platform/clock.ts` with `interface Clock { now(): number }`, `systemClock`, and `localDateOf(instant)` helpers. Create `tests/unit/helpers/fake-clock.ts` with a `FakeClock` whose time can be set and advanced
- [x] T010 [P] Write FAILING unit tests in `tests/unit/amounts.test.ts` for `scaleIngredients` and `formatGrams` as listed in contracts/domain-api.md: `scaleIngredients(1230)` returns the reference grams; the sum of all ingredients equals the total passed in; `formatGrams(1.1368)` is "1.1 g"; `formatGrams(9.96)` is "10 g"; `formatGrams(201.6)` is "202 g"; one 12" pizza (280 g) gives yeast of about 1.1 g; large batches: 12 × 16" (4,200 g) sums exactly and every amount is positive and finite; a parameterised test over all 36 size × count combinations (3 sizes × 1 to 12) checks that `totalGrams` equals `ballGrams × count` and the ingredient sum equals it (constitution III, SC-003). Rule to quote: "whole grams, except under 10 g shown to one decimal"
- [x] T011 Implement `src/domain/amounts.ts`: `ballGrams(size)`, `scaleIngredients(totalGrams)` (recipe grams × total ÷ 1230, full precision, no allowance for loss), `formatGrams(grams)` (display only). Make T010 pass
- [x] T012 [P] Create `scripts/build-tokens.mjs`: read `design/tokens.json` and write `design/tokens.css` with the same layout as the current file (a `:root, [data-theme="light"]` block, a `prefers-color-scheme: dark` block guarded by `:root:not([data-theme="light"])`, a `[data-theme="dark"]` block, a spacing/radius/z-index/fonts block with the motion variables, and a `.name` class per type style with tabular figures for the Numerals group). Add a header comment "generated from tokens.json, do not edit". Then check contrast and exit non-zero on a miss in either theme: text pairs at 4.5:1 (`ink`, `ink-muted` on `surface-ground`, `surface-raised`, `surface-sunken`; `tomato` on `surface-ground` and `surface-raised`; `on-tomato` on `tomato` and `tomato-pressed`; `ink` on `tomato-soft`, `basil-soft`, `semolina-soft`; `basil` on `surface-ground`, `surface-raised`, `basil-soft`; `on-basil` on `basil`; `semolina-text` on `semolina-soft` and `surface-ground`) and non-text pairs at 3:1 (`border-strong` and `focus-ring` on the three surfaces; `tomato` and `basil` on `surface-sunken`)
- [x] T013 Update `design/tokens.json` `type.families` so the font stacks start with the self-hosted names: `"Fraunces Variable", "Fraunces", "Iowan Old Style", Georgia, serif` and `"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif`. Then run `npm run tokens` and commit the regenerated `design/tokens.css`
- [x] T014 [P] Create `src/styles/app.css` (layout only, no colours): body gutter `padding-left: max(16px, env(safe-area-inset-left, 0px))` and the right equivalent; screen container max widths from `design/reference/layout.md` (480px centred up to 767px, two columns at 768px and up, 960px cap at 1024px and up, step mode single column 560px then 640px); bottom action bar fixed to the bottom edge with `env(safe-area-inset-bottom)` and `z-index: var(--z-sticky)`.
- [x] T015 Create `src/state/store.ts` (core state only; story actions live in their own files under `src/state/actions/`, so stories never edit this file after this task): a typed app state (`request`, `bakeAt`, `fridgeMinutes`, `plan`, `ticked`, `doneAt`, `timer`, `preferences`, `progress`) as in data-model.md, with `getState()`, `subscribe(fn)` and an `update(patch)` action. Defaults: preferences `{ muted: false, keepScreenOn: true, theme: 'system' }`, screen `plan`
- [x] T016 Create `src/ui/app.ts` and `src/main.ts`: bootstrap the store, render the current screen into `#app` on every state change, switch between `plan`, `schedule` and `steps` screens (screens are stubs here), and set `data-theme` on `<html>` from `preferences.theme` (leave it unset for `system`). In `src/main.ts` import, in this order: the two `@fontsource` packages, `design/tokens.css`, `design/components.css`, `src/styles/app.css`. Also create the empty **slot files** that later stories fill in, each exporting a function that returns an empty string or node for now: `src/ui/slots/sentence.ts` (US5), `src/ui/slots/too-soon.ts` (US3), `src/ui/slots/schedule-actions.ts` (US2 start button and US4 calendar button, split into `renderStartSteps()` and `renderCalendar()`), and `src/ui/slots/menu.ts` (US6). Screens call these slots, so stories add behaviour by editing only their own slot file
- [x] T017 [P] Create `tests/e2e/helpers.ts`: `useFakeClock(page, isoTime)` using Playwright's `page.clock`, `expectTapTargets(page)` (every `button`, `input`, `a`, `[role=switch]` has a visible box of at least 48 × 48 CSS px and at least 8px from its neighbours), `expectTextSizes(page)` (body text computed at least 16px; elements with class `step-text` at least 18px; `timer-digits` at least 48px), and `expectNoAxeViolations(page)` using `@axe-core/playwright`, to be run in both `light` and `dark` by setting `data-theme`

**Checkpoint**: tokens build, `npm run lint` and `npm test` run, and an empty app renders. User stories can begin.

---

## Phase 3: User Story 1 - Plan a dough batch and see the schedule (Priority: P1) 🎯 MVP

**Goal**: Four taps produce the ball weight, total dough, ingredient list in grams and a back-timed schedule.

**Independent Test**: Choose 14", 4 pizzas, Saturday, Dinner. The plan shows ball about 310 g, total 1,240 g, ingredients in Poolish and Final dough groups, and a schedule whose last step ends at Saturday 7:30 pm and whose first step is the evening before.

### Tests for User Story 1 (write first, confirm they FAIL)

- [x] T018 [P] [US1] Write FAILING tests in `tests/unit/schedule.test.ts` for `buildPlan` and `minimumLeadMinutes` per contracts/domain-api.md: same request and `now` give the same plan; the last step's `endAt` equals `bakeAt` exactly and each step ends where the next begins; `fridgeMinutes` is always an integer from 960 to 1,440, "1,080 unless shortened to fit"; `minimumLeadMinutes()` is 1313; 14" × 4 gives `ballGrams` 310 and `totalGrams` 1240; a bake time far in the future keeps `fridgeMinutes` at 1080; results are unchanged across a daylight-saving change in the `Europe/London` and `America/New_York` zones (durations are absolute milliseconds); `bakeAt` for Saturday + `dinner` is 19:30 local; `buildPlan` for 12 × 16" gives `totalGrams` 4200 and a plan with 14 steps, and all 36 size × count combinations produce a valid plan
- [x] T019 [P] [US1] Write FAILING e2e tests in `tests/e2e/plan.spec.ts` for quickstart scenarios 1 and 2 and spec US1 scenarios 1 to 4: choose 14", 4, Saturday, Dinner and tap Make my plan, then assert ball weight, total 1,240 g, two ingredient groups, schedule times; change size and count and see amounts update without restarting; change the time chip and see every step shift while the last step still ends at the chosen time; tick an ingredient and see it stay ticked; choose 12" × 1 pizza and see yeast and honey with one decimal

### Implementation for User Story 1

- [x] T020 [US1] Implement `src/domain/schedule.ts`: `buildPlan(request, now, opts)` and `minimumLeadMinutes()` using the durations in `recipe.ts`. Convert `day` plus time choice to `bakeAt` with local time. Start with `fridgeMinutes` 1080 and keep it fixed unless the first step would be in the past (shortening is T041). The Plan shape is in data-model.md. `Request.pizzas` is an "integer 1 to 12" and `Request.day` is "tomorrow or one of the next six days"; reject values outside these. Make T018 pass
- [x] T021 [P] [US1] Create `src/ui/components/chip.ts`: `renderChipGroup({ legend, name, options, selected, onChange })` producing the `fieldset.chipset` markup from `design/reference/components/Chip/preview.html` (`label.chip > input[type=radio] + .chip-face`, `chip-lg` for size chips with `chip-sub` showing the ball weight, check mark span, `chip-sub` times on time chips)
- [x] T022 [P] [US1] Create `src/ui/components/stepper.ts`: `renderStepper({ label, value, min: 1, max: 12, onChange })` with 56px minus and plus buttons, `aria-label`s "One fewer pizza" and "One more pizza", `aria-live="polite"` value, and disabled state at the limits
- [x] T023 [P] [US1] Create `src/ui/components/timeline-item.ts` and `src/ui/components/ingredient-row.ts` using the markup in `design/reference/components/TimelineItem/preview.html` and `IngredientRow/preview.html` (`li.tl-item.is-done|is-now|is-later` with `dough-ball`, `clock`, `tl-day`, `tl-title`, `tl-badges`; `label.ing` with checkbox, `ing-box`, `ing-name`, `ing-amount`)
- [x] T024 [US1] Implement `src/ui/screens/plan.ts`: the size chips (12", 14", 16" with ball weights 280, 310, 350 g), pizzas stepper, a day chip group of "Tomorrow" plus the next six weekday names (short names, never dates), a time chip group (Lunch 12:30, Early dinner 6:00, Dinner 7:30), and a primary "Make my plan" button. Defaults: size 14", 4 pizzas, no day and no time preselected, and "Make my plan" is disabled with a visible hint until a day and a time are chosen (SC-001: 14" and 4 are already set, so a plan takes 3 taps). Call `renderSentenceSlot()` above the chips and `renderTooSoonSlot()` below them. No date picker anywhere
- [x] T025 [US1] Implement `src/ui/screens/schedule.ts`: plan summary strip (pizzas × size, each ball, total dough), ingredient lists grouped Poolish and Final dough with tick-off using `formatGrams`, and the timeline of steps with weekday and 12-hour clock times in local time. Changing size, count, day or time re-renders amounts and times immediately (FR-014). Call `renderStartSteps()` and `renderCalendar()` from `src/ui/slots/schedule-actions.ts` below the timeline
- [x] T026 [US1] Wire store actions in a new `src/state/actions/plan.ts`: `setRequest`, `makePlan` (calls `buildPlan` with the system clock) and `toggleTick`. Navigate from Plan to Schedule on Make my plan, and add a "Change choices" control on the schedule screen that returns to Plan with choices kept
- [x] T027 [US1] Run T018 and T019 until they pass; check the screens at 360px and 430px width with `expectTapTargets` and `expectTextSizes`

**Checkpoint**: US1 works alone. This is the MVP.

---

## Phase 4: User Story 2 - Follow the steps one at a time with timers (Priority: P2)

**Goal**: One step per screen, countdowns for short waits, alerts when a timer ends, and a running-late estimate.

**Independent Test**: Start step mode on a plan, begin the 15-minute rest, and see the countdown run, the screen stay awake, and sound, vibration where supported and a "Time is up" state at zero.

### Tests for User Story 2 (write first, confirm they FAIL)

- [ ] T028 [P] [US2] Write FAILING tests in `tests/unit/timer.test.ts` for the timer state machine: `idle → running → finished`, `running ⇄ paused`, "finish early", `addMinute`, `tickTimer` fires exactly once when `now >= endAt` and `alerted` is false, reports a correct `lateByMs` even when called a day later, and a paused timer keeps `remainingMs` and does not fire
- [ ] T029 [P] [US2] Write FAILING tests in `tests/unit/estimate.test.ts` for `estimateReady`: with every step done on time the estimate equals `bakeAt` and `minutesBehind` is 0; with one step finished 25 minutes late the estimate is 25 minutes after `bakeAt` and `minutesBehind` is 25; finishing early gives a negative value (ahead); planned step times are never changed
- [ ] T030 [P] [US2] Write FAILING e2e tests in `tests/e2e/steps.spec.ts` for quickstart scenarios 4 to 7 using the fake clock and a stubbed audio, vibration and wake lock (stub with `page.addInitScript` before load: replace `navigator.vibrate`, `window.AudioContext` and `navigator.wakeLock` with recording fakes that the test reads back from `window`): running the 15-minute rest to zero shows "Time is up" and calls sound and vibration once; no sound before the first tap; muted means no sound but the finished state and vibration still appear and the mute persists to the next visit; hiding the page for 20 minutes then showing it plays the alert and shows how long ago it ended; the fridge step shows "Come back at" with a day and time and no countdown; marking a step done 25 minutes late shows "25 min behind" and a new ready time while the schedule screen is unchanged; a refused wake lock shows the "screen may lock" note

### Implementation for User Story 2

- [ ] T031 [US2] Implement `src/domain/timer.ts` with `startTimer`, `pauseTimer`, `resumeTimer`, `addMinute`, `tickTimer` per contracts/domain-api.md. Timer fields and states: `stepId`; `state` is `idle | running | paused | finished`; `endAt`; `remainingMs`; `alerted`. Only wait steps of 120 minutes or less can have a timer. Make T028 pass
- [ ] T032 [US2] Implement `estimateReady(plan, doneAt, now)` in a new `src/domain/estimate.ts` (not `schedule.ts`) returning `{ readyAt, minutesBehind }` per data-model.md ("now or `doneAt` plus remaining planned durations"). Make T029 pass
- [ ] T033 [P] [US2] Create `src/platform/audio.ts`: `createAudio()` returns `{ unlock(), chime(), setMuted(boolean) }`. Generate a short two-note chime with the Web Audio API (no audio files), resume the audio context only on the first user tap, and do nothing before then. Create `src/platform/vibration.ts` (`vibrate(pattern)` that calls `navigator.vibrate` only when present) and `src/platform/wake-lock.ts` (`request()` and `release()` using the Screen Wake Lock API, re-requesting when the page becomes visible, returning `false` on refusal)
- [ ] T034 [P] [US2] Create `src/ui/components/toggle.ts` (markup from `design/reference/components/Toggle/preview.html`: `label.toggle`, role switch, `toggle-state` with On and Off text) and `src/ui/components/timer.ts` (`.timer` with `--p` set from elapsed percent, `timer-ring`, `timer-ball`, `timer-digits` at least 48px, `timer-state` words Ready to start, Resting, Paused, Time is up, and actions Start, Pause, Resume, +1 min, Finish early)
- [ ] T035 [P] [US2] Create `src/ui/components/step-card.ts`: `article.step` with "Step N of 14", the `dough-dots`, a title, the scaled amounts for that step only, `step-text` at 18px, and Back and "Done, next step" buttons
- [ ] T036 [US2] Implement `src/ui/screens/steps.ts`: show the current step; for waits of 120 minutes or less show the timer component; for longer waits show "Come back at <weekday> <time>" with no countdown; a "Keep screen on" toggle (on by default) with the refusal note; a mute control; "Done, next step" records `doneAt` and advances; show the running-late line (for example "25 min behind. Ready about 8:10 pm") from `estimateReady`
- [ ] T037 [US2] Wire timers in a new `src/state/actions/timer.ts` and the steps screen: start, pause, resume and finish early update `timer`; a 250 ms display refresh while the page is visible; on `visibilitychange` to visible run `tickTimer`, and if it fires play the alert and show "ended N min ago". On fire: `chime()` (skipped if muted), `vibrate([200, 100, 200])`, and set the finished state. Request the wake lock when a timer starts if `keepScreenOn` is true and release it when the timer ends
- [ ] T038 [US2] Implement `renderStartSteps()` in `src/ui/slots/schedule-actions.ts`: a "Start step-by-step" button that opens the steps screen at the first step; run T028 to T030 until they pass

**Checkpoint**: US1 and US2 work together. US2 needs the plan from US1 but not the other stories.

---

## Phase 5: User Story 3 - Not enough time: show the earliest possible ready time (Priority: P3)

**Goal**: A too-soon request never shows an error. It shows the earliest ready time with a one-tap way to use it.

**Independent Test**: With the clock at Friday 6 pm, choose Saturday Lunch. A note shows the earliest ready time and a button that applies it.

### Tests for User Story 3 (write first, confirm they FAIL)

- [x] T039 [P] [US3] Write FAILING tests in `tests/unit/earliest.test.ts` for `earliestReady` and for `buildPlan` status: with `now` Friday 18:00, Saturday `lunch` gives status `tooSoon` and `earliest` set; the earliest result is the first slot among Lunch, Early dinner and Dinner over the next eight days that fits a 960-minute fridge; a bake time exactly at the minimum lead (1313 minutes) is `ok`, one minute less is `tooSoon`; `fridgeMinutes` shortens from 1080 toward 960 before reporting `tooSoon`; "If the first step's time is already in the past" is `tooSoon`
- [x] T040 [P] [US3] Write FAILING e2e tests in `tests/e2e/too-soon.spec.ts` for quickstart scenario 3 and spec US3 scenarios 1 to 3: the note names the earliest day and time, the button applies it and the plan then shows, no error screen appears, and an unworkable day or time chip carries a visible label saying why

### Implementation for User Story 3

- [x] T041 [US3] Implement `earliestReady(now, today)` in a new `src/domain/earliest.ts` and extend `buildPlan` in `src/domain/schedule.ts` (US3 is the only story that edits `schedule.ts` after US1) to set `status: 'tooSoon'` and `earliest` per data-model.md ("`tooSoon` is never an error; it always carries `earliest`"). Implement the fridge shortening rule ("keep the fridge rest between 16 and 24 hours"). Make T039 pass
- [x] T042 [P] [US3] Create `src/ui/components/banner.ts` with the `.banner` markup (clock icon, `banner-title`, one sentence, one primary button) and a success variant `banner-ok`
- [x] T043 [US3] In `src/ui/slots/too-soon.ts` show the banner "Not enough time for <day time>" with "This dough needs about 22 hours. The earliest it can be ready is <day time>." and a "Use <day time>" button that sets the request and makes the plan. Label unworkable day and time chips with a short reason using `chip-sub` text (never colour alone). Make T040 pass

**Checkpoint**: US3 works on top of US1.

---

## Phase 6: User Story 4 - Put the schedule in the phone's calendar (Priority: P4)

**Goal**: One tap adds an event for every step, with an alarm at the end of every wait.

**Independent Test**: Tap Add to calendar on a plan. The file has one event per step at the right time, a start alarm on active steps and an end alarm on waits.

### Tests for User Story 4 (write first, confirm they FAIL)

- [x] T044 [P] [US4] Write FAILING tests in `tests/unit/ics.test.ts` for `buildIcs` per contracts/calendar-ics.md: CRLF line endings; lines folded at 75 octets; `PRODID:-//Pizza Dough Planner//EN`, `VERSION:2.0`; one `VEVENT` per step with `UID` `<planId>-<stepId>@pizza-dough-planner` stable for the same request and `bakeAt`; `DTSTART` and `DTEND` in UTC with a minimum 5-minute length for active steps; `SUMMARY` "Pizza dough: <title>"; `TRANSP:TRANSPARENT`; active steps get a `VALARM` with `TRIGGER;VALUE=DATE-TIME` at the start; wait steps get one at the end with the description "Time to move on: <next step title>"; the `final-proof` alarm is at the bake time; the file does not change when the user is running late
- [x] T045 [P] [US4] Write FAILING e2e tests in `tests/e2e/calendar.spec.ts` for quickstart scenario 8 and spec US4 scenarios 1 to 3: tapping Add to calendar triggers a download of `pizza-dough-<bake date>.ics`; when the file cannot be handed over the page shows a plain message and a "Copy calendar file" option and the plan is unaffected

### Implementation for User Story 4

- [x] T046 [US4] Implement `src/domain/ics.ts` (`buildIcs(plan, exportedAt)`) with a `planId` hash of the request and `bakeAt`. Make T044 pass
- [x] T047 [P] [US4] Create `src/platform/calendar-file.ts`: `deliver(text, filename)` that offers the file as a download (and the share action where available), returns a result, and a `copy(text)` fallback using the clipboard with a selectable-text fallback
- [x] T048 [US4] Implement `renderCalendar()` in `src/ui/slots/schedule-actions.ts`: an "Add to calendar" secondary button, the success banner "Added to your calendar. You will get a reminder for every step." and the failure message with the Copy option. Make T045 pass

**Checkpoint**: US4 works on top of US1.

---

## Phase 7: User Story 5 - Say or type the request (Priority: P5)

**Goal**: One sentence fills the same visible, editable choices.

**Independent Test**: Enter "four 14-inch pizzas for Saturday dinner". Size, count, day and time are set and shown as tags that can be changed by tapping.

### Tests for User Story 5 (write first, confirm they FAIL)

- [x] T049 [P] [US5] Write FAILING tests in `tests/unit/request.test.ts` for `parseRequest` using the cases in contracts/request-sentence.md: "four 14-inch pizzas for Saturday dinner" gives 4, 14", Saturday, dinner; "2 pizzas tomorrow lunch"; "sixteen inch" gives size only; "pizza night" gives nothing; "four 18-inch pizzas" gives 4 only; digits and number words one to twelve; 0 and 13 are rejected; weekday names full and short; "this Saturday"; the function never throws on empty, very long or odd input; `understood` holds the tag labels
- [x] T050 [P] [US5] Write FAILING e2e tests in `tests/e2e/sentence.spec.ts` for quickstart scenario 9 and spec US5 scenarios 1 to 4: a full sentence sets the chips and shows tags; a partly understood sentence sets only those fields; an unreadable one shows "Try: 4 pizzas, 14 inch, Saturday dinner" and changes nothing; with speech unavailable only typing is offered with the keyboard-dictation hint

### Implementation for User Story 5

- [x] T051 [US5] Implement `src/domain/request.ts` (`parseRequest(text, today)`) per contracts/request-sentence.md. It never throws and never guesses. Make T049 pass
- [x] T052 [P] [US5] Create `src/platform/speech.ts`: `isAvailable()` (looks for `SpeechRecognition` or `webkitSpeechRecognition`), `listen({ onText, onEnd })` started only from a tap and stoppable by a second tap
- [x] T053 [P] [US5] Create `src/ui/components/text-field.ts`: `.field` with label "Say or type it", `field-input`, an optional `.mic` button (`aria-label` "Speak your request", `aria-pressed` while listening), `field-status` text "Listening… tap the mic to stop.", the `.tags` row for what was understood, and the one-line note that the browser may send audio to its vendor to recognise it
- [x] T054 [US5] Implement `src/ui/slots/sentence.ts` (the text field above the chips). Submitting or finishing speech parses with `parseRequest` and sets only the returned fields in the store. Make T050 pass

**Checkpoint**: US5 works on top of US1.

---

## Phase 8: User Story 6 - Come back, share and use offline (Priority: P6)

**Goal**: Plans and timers survive closing the browser, a shared link restores choices, a reset clears saved data, and everything works offline.

**Independent Test**: Make a plan, close and reopen the page and see the same plan and step; open the shared link elsewhere and see the same choices; go offline after one load and keep planning and following steps.

### Tests for User Story 6 (write first, confirm they FAIL)

- [ ] T055 [P] [US6] Write FAILING tests in `tests/unit/persistence.test.ts` for saved state under key `pdp:v1` per contracts/saved-state.schema.json: a saved and reloaded state is equal; a missing, invalid or unknown-version object loads as empty; unknown fields are ignored; every read and write survives a storage that throws; "Start a new plan" clears request, plan inputs, ticks, steps and timers but keeps `preferences`; "Clear saved data" removes everything including preferences; the step list is rebuilt from `request`, `bakeAt` and `fridgeMinutes` and is identical after a reload with a later clock
- [ ] T056 [P] [US6] Write FAILING tests in `tests/unit/share-link.test.ts` per contracts/share-link.md: params `s`, `n`, `d`, `t`; invalid or missing ones are ignored; a past `d` or a `d` more than six days after tomorrow is ignored while the other choices still apply; writing a link includes only the request
- [ ] T057 [P] [US6] Write FAILING e2e tests: `tests/e2e/resume.spec.ts` for quickstart scenarios 10 and 12 and spec US6 scenarios 1 to 7 (reload resumes the same screen, step, ticks and timer time left or ended; Start a new plan asks to confirm and keeps mute; Clear saved data asks to confirm and clears all; a shared link restores the four choices and, when saved data also exists, asks "Open the shared plan or keep your current one?"; missing saved data shows the start screen with no error); and `tests/e2e/offline.spec.ts` for scenario 11 (load once, set the browser context offline, reload, plan, view the schedule and follow steps)

### Implementation for User Story 6

- [ ] T058 [US6] Implement `src/state/persistence.ts`: `load()`, `save(state)`, `clearPlan()` (keeps preferences) and `clearAll()` against `localStorage` key `pdp:v1`, with validation against the schema shape, try and catch around every access, and a debounce on `save`. Make T055 pass
- [ ] T059 [P] [US6] Implement `src/state/share-link.ts`: `readLink(url, today)` and `writeLink(request)` per contracts/share-link.md. Make T056 pass
- [ ] T060 [US6] In a new `src/state/hydrate.ts` (called from `main.ts`), hydrate the store on start: load saved state, apply a shared link, rebuild the plan with `stepsFromSaved` (put it in a new `src/domain/saved.ts`), restore the screen, current step, ticks and timer (running timers recompute time left from `endAt`; an ended one shows its finished state), and save on every relevant change. Show the start screen with the choices from the link if nothing is saved
- [ ] T061 [P] [US6] Create `src/ui/screens/settings.ts` reachable from the menu in `src/ui/slots/menu.ts` on every screen: "Share this plan" (copies the link, with the share sheet where available), "Start a new plan" and "Clear saved data", each with an in-page confirmation (never `confirm()`), the mute toggle and theme choice (System, Light, Dark)
- [ ] T062 [P] [US6] Create `public/manifest.webmanifest` (name "Pizza Dough Planner", `display: standalone`, `start_url: "/"`, theme and background colours taken from the tokens' light `surface-ground` and `tomato` values, 192 and 512 px icons) and add `public/icons/icon-192.png` and `public/icons/icon-512.png` using the dough-ball mark on `tomato`. Making the page installable stays optional (constitution VI)
- [ ] T063 [US6] Write `public/sw.js` (about 60 lines): on install precache the build's file list, on activate delete old caches, on fetch answer from cache first and fall back to the network, with a cache name containing the build version. Fill the `precacheList()` plugin in `vite.config.ts` to inject the list of emitted files (including font files) into `sw.js` at build time. Register the service worker in `src/main.ts` only in production builds and only when supported
- [ ] T064 [US6] Make T057 pass in both browsers, including the offline spec against the production build

**Checkpoint**: All six stories work together.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story quality and constitution compliance.

- [ ] T065 [P] Write `tests/e2e/a11y.spec.ts` for quickstart scenario 13: for every screen (Plan, Schedule, Step mode, Settings, banner and finished-timer states) in `light` and `dark`, run `expectNoAxeViolations`, `expectTapTargets` and `expectTextSizes`; check keyboard-only completion of a plan and the first step; check every control has an accessible name; check selected, done, running, paused and too-soon states show a shape, icon or word besides colour
- [ ] T066 [P] Add a reduced-motion test to `tests/e2e/a11y.spec.ts` (emulate `prefers-reduced-motion: reduce`): no animation runs on the mic, timer ball or finished ring, and states still show
- [ ] T067 [P] Create `scripts/check-budget.mjs` and run it after `npm run build`: fail if the gzipped JavaScript exceeds 50 KB; print the sizes. Add it to the `build` script. (Plan performance goal)
- [ ] T068 [P] Add the two self-hosted fonts to `design/tokens.json` `type.fonts` with the woff2 file paths emitted by the build, and re-run `npm run tokens` so the design system file and the app agree
- [ ] T069 Update `CLAUDE.md` with the real commands (`npm run dev`, `build`, `preview`, `tokens`, `lint`, `test`, `test:e2e`, how to run one unit test with `npx vitest run tests/unit/<file>`, and one e2e spec with `npx playwright test tests/e2e/<file>`) and the architecture split (`domain` pure, `platform` adapters, `ui`, `state`) as constitution Development Workflow requires
- [ ] T070 Amend the constitution with `/speckit-constitution` to replace `TODO(TECH_STACK)` with this stack (TypeScript, Vite, Vitest, Playwright, no runtime dependencies) and remove the Sync Impact Report comment before committing
- [ ] T071 [P] Check requirement coverage: every functional requirement FR-001 to FR-040 maps to at least one passing test. Add a short coverage table to `specs/001-pizza-dough-planner/checklists/coverage.md`, listing any requirement without a test and adding the missing test
- [ ] T072 Run the whole of `quickstart.md`: `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, then scenarios 1 to 13 and fix what fails
- [ ] T073 Check the real-device list at the end of `quickstart.md` on one iPhone and one Android phone, over HTTPS: calendar file hand-off, timer sound with the silent switch, locked-phone alert on return, home-screen install in airplane mode, and dark theme at low brightness. Record results in `specs/001-pizza-dough-planner/checklists/devices.md`, and add the iPhone "Copy calendar file" fallback if hand-off fails
- [ ] T074 Pick a static HTTPS host, deploy `dist/`, and confirm the service worker, wake lock and speech detection work on the deployed address

- [ ] T075 [P] Write `tests/e2e/privacy.spec.ts` (FR-029, SC-010): after the first load, record every network request during a full plan, step mode, share and calendar flow and fail on any request to another origin or any request after the page has loaded, apart from the service worker's own same-origin cache fills
- [ ] T076 [P] Add the alert-scope note to step mode ("Alerts play while this page is open. Calendar alarms cover a locked phone.") in `src/ui/components/timer.ts` and a test in `tests/e2e/steps.spec.ts` that no copy anywhere promises alerts on a locked or closed page (FR-022)
- [ ] T077 Run `/speckit-analyze` again after the last wave and resolve any finding above LOW before T072

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup and blocks every story.
- **User stories (Phases 3 to 8)**: depend on Foundational.
- **Polish (Phase 9)**: depends on the stories you want to ship.

### User Story Dependencies

- **US1 (P1)**: starts after Foundational. Nothing else needed. It is the MVP.
- **US2 (P2)**: needs the plan and schedule screens from US1. Independent of US3 to US5.
- **US3 (P3)**: needs `buildPlan` and the plan screen from US1. Independent of US2, US4, US5.
- **US4 (P4)**: needs the schedule screen from US1. Independent of the others.
- **US5 (P5)**: needs the plan screen from US1. Independent of the others.
- **US6 (P6)**: persists everything the other stories produce. Build it last. Its timer and step restore tasks (T060) need US2, and its share link needs US1.

### Within Each Story

- Write the tests and watch them fail before the code that satisfies them.
- Domain logic first, then platform adapters, then components, then the screen, then wiring.
- A story is done when its tests and its independent test pass.

### Parallel Opportunities

The full multi-agent plan, with lanes, file ownership and merge order, is in [parallel-plan.md](parallel-plan.md). In short:

- Setup: T004, T005, T006 and T007 run together after T001 to T003.
- Foundational: T008, T009, T010, T012, T014 and T017 touch different files and run together; T011 follows T010; T015 and T016 follow T009.
- Within a story, the `[P]` test tasks run together, and so do its components (for example T021, T022, T023 in US1; T033, T034, T035 in US2).
- After US1 is merged, US2, US3, US4 and US5 can proceed in parallel. They no longer share files: each owns its own domain file, slot file and action file (see the "Slot files" note in T016). US6 follows them.

### Parallel Example: User Story 1

```text
# Tests together
T018 tests/unit/schedule.test.ts
T019 tests/e2e/plan.spec.ts

# Components together
T021 src/ui/components/chip.ts
T022 src/ui/components/stepper.ts
T023 src/ui/components/timeline-item.ts and ingredient-row.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup.
2. Phase 2 Foundational.
3. Phase 3 User Story 1.
4. **Stop and validate**: run quickstart scenarios 1 and 2 on a phone.
5. Share it if useful.

### Incremental Delivery

1. Setup and Foundational give a working shell.
2. US1 gives plans and schedules (MVP).
3. US3 next, because the too-soon note prevents a dead end for the most common mistake.
4. US2 for step mode and alerts.
5. US4 and US5 in either order.
6. US6 to make it durable and offline, then Polish.

Each story adds value without breaking the earlier ones.

---

## Notes

- `[P]` tasks touch different files and have no unfinished dependencies.
- The `[Story]` label ties each task back to the spec for traceability.
- Commit after each task or small group.
- Stop at any checkpoint to check the story on its own.
- Avoid vague tasks, two tasks editing the same file at once, and cross-story dependencies that break independence.
