# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

`pizza-app` has no application code yet, no README, no package manifest, no git history, and no build, lint or test tooling. The only contents are Spec Kit scaffolding (`.specify/` and `.claude/skills/`). Do not invent build or test commands. Once a stack is chosen, update this file with the real commands.

## Workflow: Spec Kit (spec-driven development)

Spec Kit v1.0.8 is installed with the `claude` integration (scripts in Python, `script: "py"`). Features are developed through slash-command skills in `.claude/skills/`, normally in this order:

1. `/speckit-constitution`: fill in `.specify/memory/constitution.md`. It is still the unfilled template with `[PROJECT_NAME]` and `[PRINCIPLE_N_NAME]` placeholders, so run this first.
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
