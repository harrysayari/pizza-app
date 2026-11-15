# Parallel Implementation Plan (multi-agent)

How to build `tasks.md` with several agents at once without them overwriting each other. Task IDs refer to `tasks.md`.

## Assessment

- **Foundational work is mostly sequential at the seams, parallel inside.** Setup and Foundational share `package.json`, `src/main.ts` and the store, so one agent owns the shell. The pure domain work (T008 to T011), the token script (T012, T013) and the test helpers (T009, T017) touch separate files and can run beside it.
- **US1 gates everything.** US2 to US5 all need `buildPlan`, the store and the plan and schedule screens. They can start their tests and pure logic early, but they cannot be merged before US1.
- **After US1, US2 to US5 are independent** once the file collisions found in the analysis (I1, I2) are removed. `tasks.md` now gives each story its own domain file, slot file and action file, so no two agents edit one file.
- **US6 is last.** It persists what the others produce and its restore step (T060) needs US2.
- **Parallel limit is about four agents.** More than that mainly adds merge work. The real speed-up is Wave 2 (four stories at once).

## Option A: lanes by user story (recommended)

One agent per story, each in its own git worktree and branch, merged in wave order.

| Wave | Lane | Tasks | Owns (only these files) |
|---|---|---|---|
| 0 | Lead (you or one agent) | T001 to T003, then T004 to T007 | root config, `scripts/check-style.mjs` |
| 1 | A: Shell and UI base | T014, T015, T016, T017 | `src/styles/app.css`, `src/state/store.ts`, `src/ui/app.ts`, `src/main.ts`, `src/ui/slots/*` (stubs), `tests/e2e/helpers.ts` |
| 1 | B: Domain and amounts | T008 to T011 | `src/domain/recipe.ts`, `amounts.ts`, `src/platform/clock.ts`, `tests/unit/helpers/`, `amounts.test.ts` |
| 1 | C: Tokens | T012, T013 | `scripts/build-tokens.mjs`, `design/tokens.json`, `design/tokens.css` |
| 2 | D: US1 plan and schedule | T018 to T027 | `src/domain/schedule.ts`, `src/ui/components/{chip,stepper,timeline-item,ingredient-row}.ts`, `src/ui/screens/{plan,schedule}.ts`, `src/state/actions/plan.ts`, `tests/*/plan*`, `schedule.test.ts` |
| 3 | E: US2 steps and timers | T028 to T038, T076 | `src/domain/{timer,estimate}.ts`, `src/platform/{audio,vibration,wake-lock}.ts`, `src/ui/components/{toggle,timer,step-card}.ts`, `src/ui/screens/steps.ts`, `src/state/actions/timer.ts`, `renderStartSteps()` in `schedule-actions.ts` |
| 3 | F: US3 too soon | T039 to T043 | `src/domain/earliest.ts`, edits to `schedule.ts` (only this lane), `src/ui/components/banner.ts`, `src/ui/slots/too-soon.ts` |
| 3 | G: US4 calendar | T044 to T048 | `src/domain/ics.ts`, `src/platform/calendar-file.ts`, `renderCalendar()` in `schedule-actions.ts` |
| 3 | H: US5 sentence | T049 to T054 | `src/domain/request.ts`, `src/platform/speech.ts`, `src/ui/components/text-field.ts`, `src/ui/slots/sentence.ts` |
| 4 | I: US6 persistence and offline | T055 to T064 | `src/state/{persistence,share-link,hydrate}.ts`, `src/domain/saved.ts`, `src/ui/screens/settings.ts`, `src/ui/slots/menu.ts`, `public/*`, `vite.config.ts` |
| 5 | J: Polish | T065 to T071, T075, T077 | `tests/e2e/{a11y,privacy}.spec.ts`, `scripts/check-budget.mjs`, docs |
| 6 | Lead | T072 to T074 | whole-app validation, real devices, deploy |

Two collisions remain and are handled by order, not by agents: E and G both edit `schedule-actions.ts` (a separate exported function each, so the merge is a trivial append), and E and F both read `schedule.ts` (only F edits it).

Wave 1 lane B must finish T008 and T011 before lane D starts. Lane A must merge before any Wave 3 lane, because the slot stubs and store core live there.

## Option B: lanes by layer

One agent for all `src/domain/` plus unit tests, one for `src/ui/` plus components, one for `src/platform/` and `src/state/`, one for e2e. Fewer file conflicts per lane, but every user-visible feature then waits for three lanes, nothing is demonstrable until the end, and the contracts between lanes (`domain-api.md`) get tested late. Use it only if the domain contract is considered stable and you want maximum unit-test throughput.

## Option C: hybrid, two phases

Phase 1: layers (Wave 1 above, plus all pure domain files and their unit tests for US2 to US5, which need only `contracts/` and `data-model.md`). Phase 2: stories (UI and e2e only). Fastest on paper, because the domain tests for all stories can be written at once, but it breaks "each story is independently testable" and the e2e tests then run late.

**Recommendation: Option A.** It matches the constitution (test the behaviour, stories independently shippable) and gives a demoable MVP after Wave 2.

## Rules for every agent

1. Work in your own worktree and branch (`isolation: worktree`), named `lane-<letter>-<story>`.
2. Edit only the files your lane owns. If you need a change elsewhere, stop and report it; do not edit.
3. Read first: `CLAUDE.md`, `.specify/memory/constitution.md`, the spec, `plan.md`, `data-model.md`, the contracts your tasks name, `design/reference/` for UI, and `recipe-source.md` for recipe text.
4. Tests first: write the failing tests, run them and see them fail, then implement.
5. Finish with `npm run lint` and `npm test` green (and your e2e spec for UI lanes), tick your tasks in `tasks.md`, and report what you built and anything you could not verify.
6. Never add a runtime dependency, a backend call, analytics or a literal colour under `src/`.
7. The merge order is the wave order. Rebase on the integration branch before reporting done.

## Decisions I made that you may want to change

- **Plan screen defaults**: 14", 4 pizzas, no day or time preselected, "Make my plan" disabled until both are chosen (task T024, SC-001). This closes analysis item A1.
- **Ball weights stated as exact** (310 g and 350 g), closing A2.
- **Large-batch tests added** (12 × 16" and all 36 size and count combinations), closing the critical C1.
- **Not yet resolved**: A3 (day-window wording), A4 (SC-002 and SC-009 cannot be measured in the product), G3 (the 12-pizza "mixer" note has no requirement), U2 (ticks on plan change), U5 (wait-step done), and X1 (speech note missing from the spec). None blocks the waves.
