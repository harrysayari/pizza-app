# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pizza Dough Planner: a static, offline-capable phone web app that plans one pizza dough recipe back from a bake time and walks the cook through the steps with timers. TypeScript, Vite, Vitest and Playwright. No runtime dependencies, no backend, no analytics (constitution v1.2.1). The feature spec, plan and task list are in `specs/001-pizza-dough-planner/`.

## Commands

Node 22 or newer. Run `npm install` once.

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server (runs `npm run tokens` first) |
| `npm run build` | Writes `dist/` (runs `tokens` first), then `scripts/check-budget.mjs`: fails if gzipped JavaScript passes 50 KB or if the manifest or icon colours drift from `design/tokens.json` |
| `npm run preview` | Serves `dist/` the way a host would (the service worker only registers in a build) |
| `npm run tokens` | Regenerates `design/tokens.css` from `design/tokens.json` and checks contrast. Never hand-edit `tokens.css` |
| `npm run lint` | `tsc --noEmit` plus `scripts/check-style.mjs` (no literal colours under `src/`) |
| `npm test` | Vitest unit tests in `tests/unit/` (jsdom) |
| `npm run test:e2e` | Playwright in `tests/e2e/`, Chromium (Pixel 7) and WebKit (iPhone 14) at 390 px, fake clock, axe |

The build uses a relative Vite base (`base: './'`), so `dist/` works at the site root or under a sub-path such as `/pizza/`. Keep every URL in the page, manifest and service worker relative (`check-budget.mjs` fails the build on a root-absolute one), and serve the app with a trailing slash (`/pizza/`).

Run one unit test file: `npx vitest run tests/unit/schedule.test.ts`.
Run one e2e spec: `E2E_PORT=4395 npx playwright test tests/e2e/steps.spec.ts` (add `--project=chromium` for one browser, `-g "text"` for one test). Playwright builds and serves `dist/` itself. Always set `E2E_PORT` to a free port so it never reuses a server left over from another run or worktree. On macOS WebKit only Option+Tab reaches buttons and radios, which `a11y.spec.ts` accounts for.

## Architecture

Four layers under `src/`. Dependencies point one way: `ui` and `state` use `domain` and `platform`; `domain` imports nothing from the others.

- `src/domain/`: pure, deterministic functions with unit tests (recipe, amounts, schedule and `buildPlan`, earliest ready time, timer, running-late estimate, sentence parser, calendar file, saved-state shape). No DOM, no `Date.now()`; the clock is passed in.
- `src/platform/`: thin adapters over browser APIs (clock, audio, vibration, wake lock, speech, calendar-file hand-off). Each degrades quietly when the API is missing.
- `src/state/`: the single store (`store.ts`), actions (`actions/plan.ts`, `actions/timer.ts`), persistence to `localStorage` (`persistence.ts`), share-link read and write, and start-up restore (`hydrate.ts`).
- `src/ui/`: `app.ts` renders the current screen from state; `screens/` (plan, schedule, steps, settings), `components/` (chips, stepper, timers, banner and so on, built from the design system) and `slots/` (menu, too-soon note, sentence box, schedule actions).

Outside `src/`: `design/tokens.json` is the source of truth for colour, type, spacing and motion; `design/components.css` holds the component styles; `public/` holds the manifest, icons and `sw.js` (its precache list is filled in by a plugin in `vite.config.ts`); `scripts/` holds the token build, the style check and the budget check.

Rules that tests enforce: tap targets at least 48 px and 8 px apart, body text 16 px, step text 18 px, timer digits 48 px, AA contrast in both themes, no state shown by colour alone, reduced motion respected, and no network request after the first load (`tests/e2e/privacy.spec.ts`).

## Workflow: Spec Kit (spec-driven development)

Spec Kit v1.0.8 is installed with the `claude` integration (scripts in Python, `script: "py"`). Features are developed through slash-command skills in `.claude/skills/`, normally in this order:

1. `/speckit-constitution`: fill in `.specify/memory/constitution.md` (filled in, v1.2.1). Run it again only to amend a principle.
2. `/speckit-specify`: create a feature spec. Features are numbered sequentially (`feature_numbering: sequential`).
3. `/speckit-clarify`: resolve underspecified areas in the spec.
4. `/speckit-plan`: generate design artifacts (`plan.md`).
5. `/speckit-tasks`: generate a dependency-ordered `tasks.md`. `/speckit-taskstoissues` converts it to GitHub issues.
6. `/speckit-analyze` checks consistency across spec, plan and tasks. `/speckit-checklist` generates a feature checklist.
7. `/speckit-implement` executes `tasks.md`. `/speckit-converge` appends any unbuilt work to `tasks.md` as new tasks.

## Layout

- `.specify/templates/`: templates (spec, plan, tasks, checklist, constitution) that the skills fill in.
- `.specify/scripts/python/` (with `bash/` equivalents): helpers the skills call, such as `create_new_feature.py`, `setup_plan.py`, `setup_tasks.py` and `check_prerequisites.py`. Prefer invoking these through the skills rather than editing them.
- `.specify/workflows/speckit/workflow.yml`: workflow definition.
- `.specify/integrations/*.manifest.json`: track files installed by Spec Kit. Don't hand-edit them.
