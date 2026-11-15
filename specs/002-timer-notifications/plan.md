# Implementation Plan: Timer-End Notifications

**Branch**: none (work on `main`; ask the owner if a branch is wanted) | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-timer-notifications/spec.md`

## Summary

Make a finished timer hard to miss. In the page: a banner that stays until acted on, with a chime and vibration repeating every 30 seconds for up to 5 minutes (US1). Opt-in system notifications from one control, asked only after a tap and a plain explanation (US2). For a locked or closed phone, a small reminder service on the owner's DreamHost account that is told each wait's end time and sends a standard Web Push message (US3), with honest wording and a privacy note (US4).

Approach: the browser app stays dependency-free. One pure function says which wait ends should be registered; a sync step sends that whole set to the service. The service is a PHP script plus a per-minute cron sender, using the `minishlink/web-push` library for the encrypted push. Research: [research.md](research.md). The hosting fit is unverified and gates the service work (spike S0).

## Technical Context

**Language/Version**: App: TypeScript (strict), Node 22 tooling, unchanged. Service: PHP 8.2 or newer (DreamHost shared hosting offers PHP; PHP 8.5.11 locally)

**Primary Dependencies**: App: none at runtime (unchanged). Service only: `minishlink/web-push` through Composer, uploaded with its `vendor/` folder. Dev: PHPUnit for the service tests. Adding these needs the owner's approval first (standing rule: no new dependencies without asking)

**Storage**: App: one additive field in the `pdp:v1` object. Service: SQLite file outside the web root, one table, see [data-model.md](data-model.md)

**Testing**: Vitest (pure functions, fake clock); Playwright in Chromium and WebKit (fake push event in Chromium, control states in both); PHPUnit with a mock push server; real-device checks D1 to D6 in [quickstart.md](quickstart.md)

**Target Platform**: Phones: Safari on iOS 16.4+ as a Home Screen app (notifications need it), Chrome on Android; the service on DreamHost shared hosting (Apache, PHP, cron)

**Project Type**: Static web app plus one small server-side service (same origin, under `/pizza/api/`)

**Performance Goals**: In-page alert within 1 s (SC-001); background notification within 5 s with the page running (SC-004); reminder within 2 minutes of the end through the service (decision D2, was 1 minute); JavaScript still under 50 KB gzipped

**Constraints**: Works fully offline and with the service down (FR-026); no request before the user opts in (SC-010); all URLs relative; tap targets 48px, text 16px, both themes, reduced motion; the service stores no plan data and deletes within 24 h after the end time

**Scale/Scope**: One owner's users, tens at most; at most 2 reminders per phone at a time; 5,000-row hard cap

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution v1.2.1.

| Principle | Status | How the plan satisfies it |
|---|---|---|
| I. Design tokens | Pass | The banner and control use existing tokens and `design/components.css`; no literal colours (the style check covers `src/`). State is never colour alone (icon plus words) |
| II. Kitchen-ready usability | Pass | Alert buttons are single taps at 48px; text 16px; existing helper checks (`expectTapTargets`, `expectTextSizes`, axe in both themes) run on the new screens and alert; reduced motion respected |
| III. Correct dough math | Pass | No change to amounts or schedule |
| IV. Test the behavior that matters | Pass | Pure functions with the injected clock, written test first; e2e for the alert and control; PHP tests for the service rules (caps, retention, fixed message) |
| V. Simplicity first | Pass with a justified exception | The app adds no dependency. The service uses one library for the push encryption: see Complexity Tracking |
| VI. Zero-friction access | Pass | No account or install. The control is optional; the permission prompt follows a tap and an explanation. iPhone needs Home Screen, and the app says so |
| VII. Offline after first load | Pass | The in-page alert, timers and local notifications need no network. The service is called only when online; failure is shown and ignored (FR-026) |
| VIII. Simple inputs, forgiving behaviour | Pass | One on/off control; a missed alert shows "ended N min ago"; every blocked state has a next step |
| IX. No backend by default | Pass under its reminder-service exception | Stores only the endpoint, keys, end time and a step id; deletes within 24 h after the end time; fixed message plus one repeat; no analytics or accounts; the app works fully without it; the owner chose this (clarification Q1 B) |

Gate result: no unjustified violation.

## Project Structure

### Documentation (this feature)

```text
specs/002-timer-notifications/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/reminders-api.md
├── checklists/requirements.md
└── tasks.md              # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── reminders.ts          # desiredReminders, diffReminders (pure)
│   ├── alert.ts              # activeAlert, chimeTimes (pure)
│   └── saved-state.ts        # + prefs.notify (additive, defaults to off)
├── platform/
│   └── notifications.ts      # permission, subscription, showNotification; degrades quietly
├── state/
│   └── actions/notify.ts     # turn on/off, sync with the service, snooze
└── ui/
    ├── components/alert-banner.ts   # the stay-until-acted banner and its repeats
    └── slots/notify-control.ts      # the control and its explanation (settings and step mode)
public/sw.js                  # + push and notificationclick handlers
service/                      # new: PHP reminder service (not part of dist/)
├── public/api/reminders.php, .htaccess
├── src/ (store, validation, steps list, sender)
├── send-due.php
├── composer.json
└── tests/
tests/unit/ , tests/e2e/      # new specs for each user story
```

**Structure Decision**: Keep the four existing app layers and add one top-level `service/` folder with its own tests and Composer file. `domain/` stays pure and imports nothing from other layers. `service/` is built and uploaded separately from `dist/`, and `deploy-dreamhost.md` gets a section for it. `check-budget` is extended to require the VAPID public key variable and to keep new URLs relative.

## Decisions for the owner

- **D1 (gate)**: Run spike S0 before building the service. If DreamHost cannot run a per-minute cron or reach the push services, choose: a different small host, a DreamHost VPS, or a coarser schedule with a relaxed promise.
- **D2**: Relax FR-027 and SC-005 from "within 1 minute" to "within 2 minutes", because a per-minute sender can be up to a minute late. Recommended. The spec text has not been changed yet.
- **D3**: Keep the added "Remind me in 15 min" action on the long-wait alert (flagged as my own addition).
- **D4**: Approve adding `minishlink/web-push` (service) and PHPUnit (dev).
- **D5**: Whether to commit the 002 spec and constitution work now, and whether to use a branch.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| A server-side Composer dependency (`minishlink/web-push`) in the service | Web Push needs ECDH, HKDF, AES-128-GCM and ES256 signing | Hand-written crypto is risky; a payload-less push is unverified on iPhone and would make repeat and mute depend on worker storage |
| A second deployable (`service/`) beside the static `dist/` | The only way to send a message to a closed or locked phone | A page-only design cannot reach a closed page; calendar alarms remain the fallback and are unchanged |

## Post-design Constitution re-check

The design adds no principle conflict. The sync design (full desired set, replace semantics) keeps the service at the data listed in principle IX and makes cancel, pause and early finish work through one rule. The hosting fit (R1) is the one open risk and is a gate, not a violation.
