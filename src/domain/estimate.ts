// Running-late estimate. Pure. It never changes the planned step times (FR-040).

import type { Instant } from '../platform/clock';
import type { Plan } from './schedule';

const MINUTE_MS = 60_000;

export interface ReadyEstimate {
  readyAt: Instant;
  /** Positive when behind the plan, negative when ahead. */
  minutesBehind: number;
}

/**
 * The time the dough will be ready: `doneAt` of the last finished step plus the planned
 * durations of the steps after it. With nothing done yet it is the planned bake time, or
 * `now` plus every planned duration if the first step is already overdue.
 */
export function estimateReady(plan: Plan, doneAt: Record<string, Instant>, now: Instant): ReadyEstimate {
  const steps = plan.steps;
  let last = -1;
  steps.forEach((s, i) => {
    if (doneAt[s.id] !== undefined) last = i;
  });

  const remaining = (from: number): number =>
    steps.slice(from).reduce((sum, s) => sum + (s.endAt - s.startAt), 0);

  const readyAt =
    last >= 0
      ? doneAt[steps[last]!.id]! + remaining(last + 1)
      : Math.max(plan.bakeAt, now + remaining(0));
  return { readyAt, minutesBehind: Math.round((readyAt - plan.bakeAt) / MINUTE_MS) };
}
