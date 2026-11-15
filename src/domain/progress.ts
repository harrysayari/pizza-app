// Progress for the step screen: which part of the plan you are in, and how long this step takes.
// Pure: no DOM and no clock. It reuses planParts, so the breadcrumb always agrees with the schedule.

import { formatDuration, planParts, type PartId, type Plan } from './schedule';

export type CrumbState = 'done' | 'now' | 'next';

export interface Crumb {
  id: PartId;
  label: string;
  state: CrumbState;
}

const LABELS: Readonly<Record<PartId, string>> = {
  poolish: 'Poolish',
  'rest-poolish': 'Rest',
  'make-dough': 'Final dough',
  'rest-dough': 'Final rest',
};

/** One crumb per part. `currentIndex` is the 0-based step; pass the step count for "all done". */
export function progressCrumbs(plan: Plan, currentIndex: number): Crumb[] {
  const parts = planParts(plan);
  const currentId = plan.steps[currentIndex]?.id;
  const now = parts.findIndex((p) => p.steps.some((s) => s.id === currentId));
  return parts.map((p, i) => ({
    id: p.id,
    label: LABELS[p.id],
    state: now === -1 || i < now ? 'done' : i === now ? 'now' : 'next',
  }));
}

export interface StepTimeInput {
  plannedMinutes: number;
  timer: 'idle' | 'running' | 'paused' | 'finished';
  remainingMs: number;
}

/** "15 min" before the step starts, "10 min more" while a timer runs, "Time is up" at the end. */
export function stepTimeText(i: StepTimeInput): string {
  if (i.timer === 'finished') return 'Time is up';
  if (i.timer === 'idle') return formatDuration(i.plannedMinutes);
  if (i.remainingMs < 60_000) return 'under 1 min more';
  return `${formatDuration(Math.ceil(i.remainingMs / 60_000))} more`;
}
