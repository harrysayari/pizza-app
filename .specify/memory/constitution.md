<!--
SYNC IMPACT REPORT (temporary; remove before commit)
Version change: 1.2.0 -> 1.2.1 (PATCH: wording clarification only, no change of meaning)
Modified principles:
  - IX. No Backend by Default: the reminder service exception now says a registration is deleted
    once its reminder (and its single repeat) is sent or cancelled, and in any case within 24
    hours AFTER ITS END TIME (it said "within 24 hours", which a fridge-rest reminder registered
    a day ahead could not meet). The fixed message may be sent once more as one repeat,
    5 minutes later.
  - All other principles unchanged
Added sections: none
Removed sections: none
Follow-up TODOs (outside this command's scope):
  - Update "constitution v1.1.0 / v1.1.1 / v1.2.0" references to v1.2.1 in CLAUDE.md,
    specs/001-pizza-dough-planner (spec.md, plan.md, tasks.md) and the feature 002 spec.
  - Reword specs/001 FR-022 for feature 002 ("no delivery promise").
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
The product MUST run as static files. It MUST NOT include analytics, accounts or third-party
runtime services, and MUST NOT add any server component, except the single optional exception
below. Any other server or service requires the constitution to be amended first.

Exception, timer reminders: a small reminder service MAY exist for the optional "notify me when
a timer ends" feature, and the browser's and phone's own notification channel MAY carry the
message. The service MUST hold only an address for the phone's notification channel, the timer's
end time and the step name. It MUST NOT receive a plan, a name, an email address, a location or
any identifier used for analytics. It MUST delete a registration once its reminder (and its
single repeat) is sent or cancelled, and in any case within 24 hours after its end time. It MUST
keep no logs that link an address to a step or time, and MUST send only the fixed timer-end
message, once and then at most once more as a single repeat 5 minutes later, to a phone that
opted in. The product MUST work fully when the service is off, down or unreachable, and the
user MUST be told in plain words, before agreeing, exactly what is sent.
Rationale: no backend means no accounts, no data to protect and nothing to keep running. The
exception is the smallest one that lets a locked phone be reminded, and it holds no plan data.

## Additional Constraints

- Technology stack: TypeScript (strict) built with Vite into static files, with plain DOM and
  no UI framework. Unit tests use Vitest with jsdom. End-to-end and accessibility checks use
  Playwright (Chromium and WebKit) with axe-core. The two typefaces are self-hosted through
  `@fontsource` packages, and offline use comes from a hand-written service worker. The product
  MUST have no runtime dependencies; every package is a build or test dependency (principle V
  already governs new ones). Rationale: `specs/001-pizza-dough-planner/plan.md` and
  `research.md`.
- Timer alerts (sound, vibration and the finished state) are guaranteed only while the page
  is open. With notifications turned on, the product MAY also send a system notification, but
  delivery depends on the phone and network, so the product MUST NOT promise that any alert
  arrives on a locked or closed page. The calendar export MUST add alarms for the end of each
  waiting step so a locked phone still has a backup reminder.
- User data (recipes, plans) MUST stay local to the device unless a spec explicitly adds sync
  and defines its privacy behavior. The only data allowed to leave the device is the reminder
  registration described in principle IX, and only after the user has turned notifications on.

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

**Version**: 1.2.1 | **Ratified**: 2026-11-15 | **Last Amended**: 2026-11-15
