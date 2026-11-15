# Implementation Plan: Pizza Dough Planner

**Branch**: `001-pizza-dough-planner` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-pizza-dough-planner/spec.md`

## Summary

A phone-first web page that turns four taps (pizza size, number of pizzas, bake day, bake time) into a back-timed schedule and a one-step-per-screen guide for one reference Neapolitan dough recipe. The product is a static, client-only app: TypeScript built with Vite into plain files, no backend, no runtime libraries, UI made from the project's own design system. All planning logic is pure, tested functions with an injectable clock. State is saved on the device and in a share link, offline use comes from a small service worker, timer alerts use the browser's audio, vibration and wake-lock features while the page is open, and calendar alarms cover a locked phone. Technical decisions and risks are in [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), ES2022 output, Node.js 22 for tooling

**Primary Dependencies**: None at runtime. Build and test only: Vite, TypeScript, Vitest, jsdom, Playwright with `@axe-core/playwright`, and the `@fontsource` packages for Fraunces and Atkinson Hyperlegible (bundled as local files)

**Storage**: Browser `localStorage`, one versioned JSON object (`pdp:v1`), plus the share link's query string. No server

**Testing**: Vitest for domain logic, request parser and calendar file; Playwright (Chromium and WebKit, mobile viewport, fake clock) for acceptance scenarios, accessibility and tap and text sizes in both themes

**Target Platform**: Mobile browsers: Safari on iOS 16.4 or newer and Chrome on Android, last two major versions; current desktop browsers for development. Served over HTTPS as static files

**Project Type**: Static single-page web app (client only)

**Performance Goals**: Interactive in under 2 seconds on a mid-range phone over slow 4G; JavaScript under 50 KB gzipped; a plan computes in under 50 ms; timer alert within 1 second of its end time (SC-006)

**Constraints**: Works fully offline after first load; no network request during use; no accounts or personal data; touch targets 48px or larger; light and dark themes; WCAG AA; honours reduced motion

**Scale/Scope**: One recipe (14 steps), 3 sizes, 1 to 12 pizzas, 3 screens (Plan, Schedule, Step mode) plus a small settings and reset area

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution v1.1.0.

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. Design tokens are the source of truth | Pass | `design/tokens.json` is the only source. A script generates `design/tokens.css`. A test fails on any hex colour in `src/` styles. Both themes are covered by the e2e suite. |
| II. Kitchen-ready usability | Pass | E2E checks measure every control (48px, 8px gap), text sizes (16, 18, 48px) and axe contrast in light and dark. Reduced motion and screen-reader names are tested. Layout targets 360 to 430px. |
| III. Correct dough math | Pass | Scaling, rounding display and scheduling are pure functions in `src/domain/` with unit tests for edge cases (1 pizza, 12 pizzas, DST boundary, too-soon). |
| IV. Test the behavior that matters | Pass | Acceptance scenarios in the spec map to tests (see quickstart). Tests are written first. A `Clock` is injected everywhere and Playwright's fake clock drives long waits. |
| V. Simplicity first | Pass | No UI framework, no runtime dependency, hand-written service worker. Each dev dependency is listed with its reason in `research.md`. |
| VI. Zero-friction access | Pass | A page opened from a link. Home-screen install is optional and only a manifest. |
| VII. Offline after first load | Pass | Service worker precaches every built file. Fonts are self-hosted so nothing is fetched from another site. |
| VIII. Simple inputs, forgiving behaviour | Pass | Chips and stepper only. `tooSoon` returns the earliest ready time and never an error. Sentence entry fills the same visible choices. |
| IX. No backend by default | Pass with one noted item | No server, no analytics, no external services. The mic button uses the browser's own speech recognition, which on some browsers sends audio to its vendor. See Complexity Tracking. |

**Gate result**: Passes. No unresolved violations.

**Post-design re-check**: Passes. Design artifacts add no server, account or runtime dependency. One follow-up: the constitution's `TODO(TECH_STACK)` should be replaced by an amendment that records this stack (see Next steps).

## Project Structure

### Documentation (this feature)

```text
specs/001-pizza-dough-planner/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── share-link.md
│   ├── saved-state.schema.json
│   ├── calendar-ics.md
│   ├── request-sentence.md
│   └── domain-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
index.html
package.json
tsconfig.json
vite.config.ts           # includes the small plugin that lists built files for the service worker
playwright.config.ts

design/                  # already present; the design system, copied from the published page
├── tokens.json          # source of truth
├── tokens.css           # generated by scripts/build-tokens.mjs, never edited by hand
└── components.css

scripts/
└── build-tokens.mjs     # tokens.json to tokens.css, plus the contrast check

public/
├── manifest.webmanifest
├── sw.js                # service worker (precache list injected at build)
└── icons/

src/
├── domain/              # pure logic, no DOM, no storage, no real clock
│   ├── recipe.ts        # ingredients, steps, sizes, ball weights, chip times
│   ├── amounts.ts       # scaling and gram formatting
│   ├── schedule.ts      # buildPlan, minimumLeadMinutes
│   ├── earliest.ts      # earliestReady (US3)
│   ├── estimate.ts      # estimateReady (US2)
│   ├── saved.ts         # stepsFromSaved (US6)
│   ├── timer.ts         # timer state machine
│   ├── request.ts       # parseRequest
│   └── ics.ts           # buildIcs
├── state/
│   ├── store.ts         # app state core
│   ├── actions/         # plan.ts, timer.ts (one file per story, no shared edits)
│   ├── hydrate.ts       # load saved state and shared link on start
│   ├── persistence.ts   # saved-state read, write, clear, validate
│   └── share-link.ts    # read and write the query string
├── platform/            # thin adapters, each behind an interface so tests can fake them
│   ├── clock.ts
│   ├── audio.ts         # generated chime, unlocked on first tap
│   ├── vibration.ts
│   ├── wake-lock.ts
│   ├── speech.ts
│   └── calendar-file.ts
├── ui/
│   ├── app.ts
│   ├── screens/         # plan.ts, schedule.ts, steps.ts, settings.ts
│   ├── slots/           # sentence.ts, too-soon.ts, schedule-actions.ts, menu.ts (story extension points)
│   └── components/      # chip, stepper, text-field, toggle, timeline-item, ingredient-row, step-card, timer, banner
├── styles/
│   ├── fonts.css        # @font-face for the two self-hosted fonts
│   └── app.css          # layout only; tokens and components come from design/
└── main.ts

tests/
├── unit/                # domain, parser, calendar file, persistence
└── e2e/                 # acceptance scenarios, accessibility, offline
```

**Structure Decision**: A single client-only project. There is no backend, API or mobile shell, so the "backend" and "mobile" layouts are not used. The split between `domain/` (pure), `platform/` (browser features behind interfaces) and `ui/` (DOM) exists so constitution III and IV can be met: all logic tests run without a browser, and the e2e suite fakes the clock and the browser features.

## Complexity Tracking

> Filled only where the Constitution Check needs a justification.

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| Browser speech recognition on the mic button (principle IX) | Spec story US5 asks for "say it" as an optional shortcut. It is feature-detected, off until tapped, shows a one-line note about where audio may go, and typing always works. | Removing voice entirely drops US5. Self-hosted recognition would need a large model download and breaks the 50 KB budget. A hosted service is a backend and is banned. |
| Playwright and axe as dev dependencies (principle V) | The constitution's tap-size, text-size and contrast rules are only provable in a real browser, and WebKit is the iPhone engine. | Unit tests alone cannot check layout or contrast; manual checks do not stay proven after changes. |
| Hand-written service worker (principle V) | One fixed set of files and one cache version. About 60 lines. | A Workbox plugin adds a dependency and configuration for a case that needs none of its features. |

## Next steps

1. Run `/speckit-tasks` to turn this plan into ordered tasks.
2. Amend the constitution to replace `TODO(TECH_STACK)` with this stack (a PATCH or MINOR bump), using `/speckit-constitution`.
3. During the first implementation tasks, move the token generator from the working folder into `scripts/build-tokens.mjs`, record the real build, lint and test commands in `CLAUDE.md`, and add the two font files to `design/tokens.json`.
