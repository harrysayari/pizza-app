<!--
SYNC IMPACT REPORT (temporary; remove before commit)
Version change: 1.0.0 → 1.1.0 (MINOR: four principles added, one materially expanded)
Project name: "Pizza App" → "Pizza Dough Planner"
Modified principles:
  - II. Kitchen-Ready Usability (expanded: 16px body text floor, screen-reader labels on every
    control, reduced-motion support)
  - III. Correct Dough Math (removed "extreme temperatures" from the edge-case list)
  - I, IV, V unchanged
Added principles:
  - VI. Zero-Friction Access
  - VII. Offline After First Load
  - VIII. Simple Inputs, Forgiving Behaviour
  - IX. No Backend by Default
Added sections: none
Removed sections: none
Changed constraints: the background-reminder bullet in Additional Constraints was replaced
  with the timer-alert and calendar-alarm rule.
Follow-up TODOs:
  - TODO(TECH_STACK): still no stack chosen. Amend once the plan fixes it.
  - Optional: review principle IV (test-first); it was inferred in 1.0.0, not requested.
-->
# Pizza Dough Planner Constitution

## Core Principles

### I. Design Tokens Are the Source of Truth
All colour, spacing, type, motion and tap-target values MUST come from `design/tokens.json`.
`design/tokens.css` is generated from it and MUST NOT be edited by hand. Application and
component styles MUST reference tokens and MUST NOT use literal colour values. Both the light
and the dark ("dim kitchen") themes MUST be supported for every screen.
Rationale: one source keeps the interface consistent and makes theming a data change.

### II. Kitchen-Ready Usability
The app is used with floury hands, in dim light, at arm's length. Every tappable control MUST
meet the `tap-min` size and `tap-gap` spacing tokens. Body text MUST be at least 16px,
step-mode instruction text at least 18px, and countdown digits at least 48px. Text MUST meet
WCAG AA contrast in both themes. Every control MUST have an accessible name that a screen
reader announces, and focus MUST always be visible. Meaning MUST NOT be conveyed by colour
alone. Animation MUST honour the reduced-motion setting. The primary flow MUST work
one-handed on a phone-width screen (about 430px).
Rationale: usability under real cooking conditions is the product's reason to exist.

### III. Correct Dough Math (NON-NEGOTIABLE)
Ingredient quantities, hydration, yeast amounts and fermentation timings MUST be computed by
pure, deterministic functions that are separate from the UI. Each such function MUST have unit
tests that include edge cases (very small and very large batches) before it is used by any
screen. Results MUST NOT be silently rounded to values that change the recipe's ratios;
displayed rounding MUST be explicit.
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

### VI. Zero-Friction Access
The product MUST be a web page that opens from a link. It MUST NOT require an account, an
installation or a sign-in to plan dough or follow the steps. Adding the page to the home
screen MAY be offered but MUST remain optional.
Rationale: people use this a few times a year and will not install an app for it.

### VII. Offline After First Load
Once the page has loaded, creating a plan, viewing the schedule and following the steps MUST
work with no network connection. Features that need a network MUST be optional and MUST fail
without blocking the core flow.
Rationale: kitchens often have poor signal.

### VIII. Simple Inputs, Forgiving Behaviour
Inputs MUST be tap choices (size, number of pizzas, bake day, bake time). The product MUST NOT
use a date picker. A request that leaves too little time MUST show the earliest possible ready
time with a one-tap way to use it, and MUST NOT end in an error dead end. Optional voice or
typed entry MUST fill the same visible choices, which the user can edit, and MUST NOT replace
them.
Rationale: taps are fast with wet hands, and a wrong guess should cost one tap, not a restart.

### IX. No Backend by Default
The product MUST run as static files with no server component. It MUST NOT include analytics
or third-party runtime services unless the constitution is first amended to allow them.
Rationale: no backend means no accounts, no data to protect and nothing to keep running.

## Additional Constraints

- Technology stack: TODO(TECH_STACK): not yet chosen. Until it is, plans MUST record the
  chosen stack and its rationale, and this constitution MUST be amended to reference it.
- Timer alerts (sound, vibration and the finished state) are guaranteed only while the page
  is open. The product MUST NOT promise alerts on a locked or closed page. The calendar export
  MUST add alarms for the end of each waiting step so a locked phone still reminds the user.
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

**Version**: 1.1.0 | **Ratified**: 2026-11-15 | **Last Amended**: 2026-11-15
