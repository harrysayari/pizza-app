<!--
SYNC IMPACT REPORT (temporary; remove before commit)
Version change: (unfilled template) → 1.0.0
Modified principles: none renamed; all five principle slots filled for the first time
  - I. Design Tokens Are the Source of Truth
  - II. Kitchen-Ready Usability
  - III. Correct Dough Math (NON-NEGOTIABLE)
  - IV. Test the Behavior That Matters
  - V. Simplicity First
Added sections: Additional Constraints; Development Workflow
Removed sections: none
Follow-up TODOs:
  - TODO(TECH_STACK): no stack is chosen yet. Add stack constraints by amendment once decided.
  - Principles were inferred from the `design/` directory (Pizza Dough Planner tokens and
    components). The user supplied no input. Review and amend if the intent differs.
-->
# Pizza App Constitution

## Core Principles

### I. Design Tokens Are the Source of Truth
All colour, spacing, type, motion and tap-target values MUST come from `design/tokens.json`.
`design/tokens.css` is generated from it and MUST NOT be edited by hand. Application and
component styles MUST reference tokens and MUST NOT use literal colour values. Both the light
and the dark ("dim kitchen") themes MUST be supported for every screen.
Rationale: one source keeps the interface consistent and makes theming a data change.

### II. Kitchen-Ready Usability
The app is used with floury hands, in dim light, at arm's length. Every tappable control MUST
meet the `tap-min` size and `tap-gap` spacing tokens. Step-mode instruction text MUST be at
least 18px and countdown digits at least 48px. Text MUST meet WCAG AA contrast in both themes.
Focus MUST always be visible, and meaning MUST NOT be conveyed by colour alone. The primary
flow MUST work one-handed on a phone-width screen (about 430px).
Rationale: usability under real cooking conditions is the product's reason to exist.

### III. Correct Dough Math (NON-NEGOTIABLE)
Ingredient quantities, hydration, yeast amounts and fermentation timings MUST be computed by
pure, deterministic functions that are separate from the UI. Each such function MUST have unit
tests that include edge cases (very small and very large batches, extreme temperatures) before
it is used by any screen. Results MUST NOT be silently rounded to values that change the
recipe's ratios; displayed rounding MUST be explicit.
Rationale: a wrong number ruins food, and users cannot easily detect it.

### IV. Test the Behavior That Matters
Features MUST have tests for their acceptance scenarios from the spec. Tests for a behavior
MUST be written and observed failing before the implementation that satisfies them. Timers and
scheduling logic MUST be testable without real waiting (injectable clock).
Rationale: planning and timing logic is easy to get subtly wrong and costly to debug by hand.

### V. Simplicity First
Start with the simplest design that satisfies the spec. New dependencies, abstractions and
services MUST be justified in the plan's complexity section. Features outside the current
spec MUST NOT be built speculatively.
Rationale: a small codebase is easier to keep correct, accessible and fast.

## Additional Constraints

- Technology stack: TODO(TECH_STACK): not yet chosen. Until it is, plans MUST record the
  chosen stack and its rationale, and this constitution MUST be amended to reference it.
- Scheduled reminders and countdowns MUST remain correct when the app is backgrounded,
  reloaded or the device clock changes, or the spec MUST state the limitation explicitly.
- User data (recipes, plans) MUST stay local to the device unless a spec explicitly adds sync
  and defines its privacy behavior.

## Development Workflow

- Work follows Spec Kit order: constitution, specify, clarify, plan, tasks, implement.
  Implementation MUST NOT begin without a spec, plan and tasks for the feature.
- Every plan MUST include a Constitution Check against the principles above, with any
  violation justified in writing.
- Every change MUST be reviewed against this constitution before merge. Reviewers MUST
  check token usage, tap-target and contrast compliance, and test coverage of dough math.
- Build, lint and test commands MUST be recorded in `CLAUDE.md` once a stack is chosen.

## Governance

This constitution supersedes other project practices. Amendments MUST be made through
`/speckit-constitution`, with a stated rationale, a version bump and an updated Last Amended
date. Versioning follows semantic versioning: MAJOR for removing or redefining a principle in
a backward incompatible way, MINOR for adding a principle or section or materially expanding
guidance, PATCH for clarifications and wording fixes. When an amendment changes obligations,
open specs, plans and tasks MUST be checked for conflicts and updated. Compliance is reviewed
at each plan (Constitution Check) and each pull request. Runtime guidance for agents lives in
`CLAUDE.md`.

**Version**: 1.0.0 | **Ratified**: 2026-11-15 | **Last Amended**: 2026-11-15
