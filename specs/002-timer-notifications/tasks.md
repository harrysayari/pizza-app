---

description: "Task list for Timer-End Notifications"
---

# Tasks: Timer-End Notifications

**Input**: `specs/002-timer-notifications/` (spec, plan, research, data-model, contracts/reminders-api.md, quickstart). Constitution v1.2.1 applies.

**Tests**: Included, written first and seen failing (principle IV).

**Organization**: By user story (US1 to US4). US1 and US2 are app-only and need no server. US3 needs the reminder service and is **gated** by T040 (spike) and the owner's decisions D1 to D4 in plan.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallel (different files, no unfinished dependency)
- Paths relative to the repo root `/Users/harrysayari/Code/pizza-app`

## Conventions

- Standing rules: do not deploy, push or add dependencies without asking the owner. Never put the SFTP password or the VAPID private key in the repo or chat.
- Colours, spacing and type come from design tokens and `design/components.css`; no literal colours under `src/`. Domain code is pure with an injected clock. Browser-API calls are wrapped in try/catch and degrade quietly. All URLs relative.
- Every new screen element is checked by `expectTapTargets`, `expectTextSizes` and `expectNoAxeViolations` (`tests/e2e/helpers.ts`).

---

## Phase 1: Setup

- [x] T001 Add the additive field `prefs.notify` (`"off" | "on"`, default `off`, older saved data reads as `off`) to the saved-state shape in `src/state/persistence.ts` and `src/state/store.ts` (the saved shape lives there, not in a `saved-state.ts`; `notify` is stored only when `on`), plus `snoozes` and the timer's `ack` flag, with unit tests in `tests/unit/persistence.test.ts` (round trip, old object without the field, bad value falls back to `off`)
- [ ] T002 [P] Add `scripts/export-step-ids.mjs` that writes the 14 step ids and titles from `src/domain/recipe.ts` to `service/src/steps.json` (the only source for the service's fixed list), and a `npm run steps` script; a PHPUnit test in T042 fails if the file is stale

## Phase 2: Foundational (blocks all stories)

- [x] T003 [P] Write failing unit tests, then implement `activeAlert(plan, timer, doneAt, now)` and `chimeTimes(endAt, now, { muted, userHasTapped })` in `src/domain/alert.ts` and `tests/unit/alert.test.ts`: chime every 30 s from the end for up to 5 minutes, none before the first tap, none when muted, `kind` is `timer` or `wait`, `agoMs` for a missed end
- [x] T004 [P] Write failing unit tests, then implement `desiredReminders(plan, timer, doneAt, snoozes, now, prefs)` and `diffReminders(...)` in `src/domain/reminders.ts` and `tests/unit/reminders.test.ts` per data-model.md: running timer included; paused, finished, done and cleared excluded; long wait (over 2 hours) included once the step before is done; at most 2 entries; empty when notify off, permission not granted or no subscription; a snooze ("Remind me in 15 min") moves that wait's `endAt` to snooze time + 15 min; `silent` follows mute
- [x] T005 [P] Implement `src/platform/notifications.ts`: `support()`, `permission()`, `request()`, `show(title, options)`, `close(tag?)` (`subscribe`, `getSubscription` and `unsubscribe` are added in T048); each returns a safe value when the API is missing (iPhone normal tab reports `unavailable`)

## Phase 3: User Story 1 - In-page alert you cannot miss (P1) MVP

**Goal**: a stay-until-acted banner with repeating chime and vibration.
**Independent test**: with the page open, a timer end shows the banner on any screen, repeats every 30 s for 5 minutes, and "Done, next step" or "+1 min" stops everything.

- [x] T006 [P] [US1] Failing e2e `tests/e2e/alert.spec.ts` (with shared helpers moved to `tests/e2e/steps-helpers.ts`) (fake clock): banner appears within 1 s on the schedule and step screens (FR-001, SC-001); buttons Done, next step and +1 min (FR-002); stays until acted on; sound and vibration repeat at 30 s steps and stop after 5 minutes (FR-003); mute and first-tap rules (FR-004); acting stops sound (FR-005); reload after a missed end shows "ended N min ago" (FR-016); layout checks and axe in both themes (FR-028)
- [x] T007 [US1] Build `src/ui/components/alert-banner.ts` from `activeAlert` and mount it in `src/ui/app.ts` above every screen; styles in `design/components.css` using tokens only, an icon plus words (no colour-only meaning), reduced motion respected
- [x] T008 [US1] Wire repeat scheduling (chime and vibration via the existing adapters in `src/platform/`) and the actions in `src/state/actions/timer.ts`; "Done, next step" and "+1 min" reuse the existing timer actions
- [x] T009 [US1] Long-wait alert (FR-014): kind `wait` with "Done, next step" and "Remind me in 15 min" (stored as a snooze in state; `desiredReminders` then moves the service reminder to the new end, per data-model.md) in `src/domain/alert.ts` and the banner
- [x] T010 [US1] Run lint, unit and e2e; confirm the existing 166 e2e tests still pass

## Phase 4: User Story 2 - Opt in to notifications (P2)

**Goal**: one control, asked only after a tap and an explanation; local notification when the page is hidden but running.
**Independent test**: first load shows no prompt; the control reaches `on` in 3 taps; a hidden page gets one "Time is up" notification; the page works with notifications off, blocked or unavailable.

- [x] T011 [P] [US2] Failing e2e `tests/e2e/notify.spec.ts` (T011, T012, T015 and T016 are all in this one file): no prompt on load or navigation (FR-007, SC-003); four states with words and icon (FR-008); explanation before the prompt; blocked and unavailable give a next step; no nagging (FR-015); choice remembered and cleared by "Clear saved data", kept by "Start a new plan" (FR-018); axe and sizes
- [x] T012 [P] [US2] Failing e2e for the honest wording (FR-017, SC-008): an automated scan of all notification text for delivery promises, and the calendar-alarm backup is named
- [x] T013 [US2] Build `src/ui/slots/notify-control.ts` and the explanation dialog; mount it in settings and step mode (FR-006)
- [x] T014 [US2] Implement `src/state/actions/notify.ts`: turn on (request permission only inside the tap handler, iPhone Home Screen guidance), turn off, persist `prefs.notify`
- [x] T015 [US2] Local notification path: when notify is on, there is no active registration and the page is hidden, show the notification at the end within 5 s (FR-009, SC-004, fake-clock test), once more 5 minutes later if the user has not opened the app or acted, and never a third time; none while visible (FR-011), silent when muted (FR-013), one per end (FR-012 cancels on pause, early finish, +1 min, new timer, done, plan change, off)
- [x] T016 [US2] `public/sw.js`: add the `notificationclick` handler that focuses or opens `./?step=<id>#alert`; the page shows the alert on that step (FR-010). Navigations to `./?step=<id>` must match the precached page (`ignoreSearch`) so the tap works offline, and the page reads `step` without breaking the share-link query handling; test in `tests/e2e/offline.spec.ts` style with the network off
- [x] T017 [US2] Privacy test update in `tests/e2e/privacy.spec.ts`: no network request for users who never opt in (SC-010)

## Phase 5: User Story 3 - Locked or closed phone via the reminder service (P3)

**Goal**: a push reaches the phone within 2 minutes of the end, including the fridge rest.
**Gate**: T040 must pass and the owner must answer D1 to D4 before T041 onward.

- [ ] T040 [US3] Spike S0 with the owner on DreamHost (quickstart S0): per-minute cron, outbound HTTPS to FCM and Apple, PHP extensions. Record the result in `specs/002-timer-notifications/research.md` R1. If it fails, stop and ask for the fallback
- [ ] T041 [US3] After approval (D4): create `service/composer.json` with `minishlink/web-push` and PHPUnit (dev); commit `composer.lock`
- [ ] T042 [P] [US3] Failing PHPUnit tests in `service/tests/` for every rule in contracts/reminders-api.md: valid and invalid bodies (400), 2 KB cap (413), 5,000-row cap (429), allowed push domains by exact host match only (host equals the domain or ends with `.domain`; https only; no userinfo or non-default port; look-alikes such as `https://evil.example/?fcm.googleapis.com` and `fcm.googleapis.com.evil.example` are rejected), a test that asserts the stored columns are exactly those in data-model.md and nothing else is kept (SC-009), at most 4 reminders, `endAt` window (-60 s to 48 h), unknown fields rejected, replace semantics, `DELETE` returns 204 always
- [ ] T043 [US3] Implement `service/public/api/reminders.php`, `service/src/` (store, validation, fixed step list), and `service/public/api/.htaccess`. Store only the columns in data-model.md; no IP, no user agent, no request log
- [ ] T044 [P] [US3] Failing PHPUnit tests with a mock push server for `send-due.php`: sends at `end_at` and never early, repeat at `end_at + 300 s` once, silent flag, 404 or 410 deletes the row, rows over 24 h past `end_at` purged, a sync that no longer lists the step deletes the row so the pending repeat is never sent (SC-006), the payload decrypts to exactly `{v, kind, stepId, title, silent}`
- [ ] T045 [US3] Implement `service/send-due.php` (cron every minute) and `service/config.example.php` (VAPID keys and database path outside the web root; real values never in the repo)
- [ ] T046 [P] [US3] Failing e2e (Chromium, fake push event via the debugging protocol): visible window gets a `pdp-timer-ended` message and no notification; hidden gets one notification with tag `pdp-<stepId>`; the repeat replaces it; silent when told
- [ ] T047 [US3] `public/sw.js`: add the `push` handler per contracts/reminders-api.md (always show a notification unless a visible window handles it). Before showing, it checks which wait ends are still live from a small IndexedDB record the page keeps up to date (the service worker cannot read `localStorage`), and shows nothing for an end the app knows was cancelled (spec edge case "Cancel while offline"); the page writes the record in `src/state/actions/notify.ts` on every sync, and a test covers a cancelled end that still gets pushed
- [ ] T048 [US3] Client sync in `src/state/actions/notify.ts`: on every change, `desiredReminders` then `diffReminders` then `PUT ./api/reminders` (full set); `DELETE` on turn off and "Clear saved data"; subscribe with `VITE_VAPID_PUBLIC_KEY`; switch off the local path while a registration is active; register the long wait when the step before is marked done (FR-019, FR-020, FR-023)
- [ ] T049 [US3] Service-down handling (FR-026): failed `PUT` leaves timers, alert and local notifications working and shows a one-line message; retry on the next change; test in `tests/e2e/notify-service.spec.ts` with the route blocked
- [ ] T050 [US3] Update `scripts/check-budget.mjs` so that, only when `VITE_VAPID_PUBLIC_KEY` is set, the key looks valid and the `./api/` URL is relative (with no key the build still passes and the app uses the local path only); confirm the 50 KB budget still passes
- [x] T051 [US3] Align the spec with decision D2 (FR-027 and SC-005 to "within 2 minutes"): done 2026-11-15

## Phase 6: User Story 4 - Honest help and privacy note (P4)

**Independent test**: the control and settings explain iPhone Home Screen, blocked, and what is sent where.

- [ ] T052 [P] [US4] Failing e2e `tests/e2e/notify-help.spec.ts`: explanation names what the reminder service and the phone's notification channel receive (FR-025); iPhone-in-Safari guidance; late or missed delivery stated; calendar alarms named as the backup
- [ ] T053 [US4] Write the copy and the privacy note in `src/ui/slots/notify-control.ts` and the settings screen; copy never promises delivery; the explanation and privacy note also say the web host keeps its ordinary access log (time and address of each request, no step or plan content); re-run T012 after this task
- [ ] T054 [US4] Update the "no network" statement in the in-app privacy text to say the app sends nothing unless the user opts in

## Phase 7: Polish and cross-cutting

- [ ] T055 [P] Add a "Reminder service" section (include the host's access-log note) to `specs/001-pizza-dough-planner/deploy-dreamhost.md`: uploading `service/`, the config outside the web root, the cron line, and the rollback (turn the service off; the app keeps working)
- [ ] T056 [P] Update `CLAUDE.md` (commands and layers: `service/`, PHP tests) and remove the temporary Sync Impact Report comment from `.specify/memory/constitution.md` before committing
- [ ] T057 Run `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` (set `E2E_PORT`), and the PHPUnit suite
- [ ] T058 Real-device checks D1 to D6 from quickstart.md (owner's phones; deploy only after the owner asks)

## Dependencies and order

- Phase 1 and 2 first. US1 (Phase 3) and US2 (Phase 4) can then proceed in parallel except T015 which uses T008's alert state.
- US3 needs US2 (control and permission), T040 passing, and decisions D1 to D4. US4 can start after T013.
- Parallel examples: T003, T004, T005 together; T006 with T012; T042 with T044 with T046.

## Strategy

MVP is US1 plus US2: they ship value with no server. US3 follows only after the hosting spike passes. 36 tasks in all; T040 to T051 form the gated service block.
