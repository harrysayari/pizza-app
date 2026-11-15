// Which wait ends should be registered with the reminder service right now, and whether that set
// changed since it was last sent. Pure. The set is always sent whole (replace semantics), so
// pausing, finishing early, +1 min, Done, snoozing, muting and turning off all work by changing the
// inputs: there is no separate cancel path (specs/002 research R7).

import type { Instant } from '../platform/clock';
import type { Step } from './schedule';
import type { Timer } from './timer';

export interface Reminder {
  stepId: string;
  endAt: Instant;
  silent: boolean;
}

export interface ReminderInput {
  steps: readonly Pick<Step, 'id' | 'kind' | 'long' | 'startAt' | 'endAt'>[];
  timer: Timer | null;
  doneAt: Readonly<Record<string, Instant>>;
  snoozes: Readonly<Record<string, Instant>>;
  currentStepId: string | null;
  muted: boolean;
  /** Notifications are on, the browser permission is granted and a subscription exists. */
  enabled: boolean;
  now: Instant;
}

export function desiredReminders(input: ReminderInput): Reminder[] {
  const { steps, timer, doneAt, snoozes, currentStepId, muted, enabled, now } = input;
  if (!enabled) return [];
  const out: Reminder[] = [];

  if (timer !== null && timer.state === 'running' && timer.endAt > now && doneAt[timer.stepId] === undefined) {
    out.push({ stepId: timer.stepId, endAt: timer.endAt, silent: muted });
  }

  const i = steps.findIndex((s) => s.id === currentStepId);
  const step = i >= 0 ? steps[i]! : undefined;
  if (step !== undefined && step.kind === 'wait' && step.long && doneAt[step.id] === undefined) {
    const previousDone = i === 0 || doneAt[steps[i - 1]!.id] !== undefined;
    const endAt = snoozes[step.id] ?? step.endAt;
    if (previousDone && endAt > now) out.push({ stepId: step.id, endAt, silent: muted });
  }
  return out;
}

const key = (list: readonly Reminder[]): string =>
  JSON.stringify([...list].sort((a, b) => a.stepId.localeCompare(b.stepId)).map((r) => [r.stepId, r.endAt, r.silent]));

/** True when `next` differs from what was last sent. `null` means nothing has been sent yet. */
export function diffReminders(previous: readonly Reminder[] | null, next: readonly Reminder[]): boolean {
  if (previous === null) return next.length > 0;
  return key(previous) !== key(next);
}
