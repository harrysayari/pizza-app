// The alert for a finished timer or long wait. Pure: it is worked out from state and the time,
// so reopening the page after a missed end shows the same alert (spec FR-016).

import type { Instant } from '../platform/clock';
import type { Step } from './schedule';
import type { Timer } from './timer';

export const SNOOZE_MS = 15 * 60_000;
export const CHIME_EVERY_MS = 30_000;
export const CHIME_COUNT = 10; // every 30 seconds for 5 minutes

export interface AlertInput {
  steps: readonly Pick<Step, 'id' | 'title' | 'kind' | 'long' | 'startAt' | 'endAt'>[];
  timer: Timer | null;
  doneAt: Readonly<Record<string, Instant>>;
  /** "Remind me in 15 min" on a long wait: the wait counts as ending at this instant instead. */
  snoozes: Readonly<Record<string, Instant>>;
  currentStepId: string | null;
  now: Instant;
}

export interface TimerAlert {
  /** `timer` offers Done and +1 min; `wait` (a long wait) offers Done and Remind me in 15 min. */
  kind: 'timer' | 'wait';
  stepId: string;
  title: string;
  endedAt: Instant;
  /** How long ago it ended, in ms. */
  agoMs: number;
}

export function activeAlert(input: AlertInput): TimerAlert | null {
  const { steps, timer, doneAt, snoozes, currentStepId, now } = input;

  if (timer !== null && doneAt[timer.stepId] === undefined) {
    const ended = (timer.state === 'running' && now >= timer.endAt) || (timer.state === 'finished' && timer.ack !== true);
    const step = steps.find((s) => s.id === timer.stepId);
    if (ended && step !== undefined) {
      return { kind: 'timer', stepId: step.id, title: step.title, endedAt: timer.endAt, agoMs: Math.max(0, now - timer.endAt) };
    }
  }

  const i = steps.findIndex((s) => s.id === currentStepId);
  const step = i >= 0 ? steps[i]! : undefined;
  if (step !== undefined && step.kind === 'wait' && step.long && doneAt[step.id] === undefined) {
    const previousDone = i === 0 || doneAt[steps[i - 1]!.id] !== undefined;
    const endedAt = snoozes[step.id] ?? step.endAt;
    if (previousDone && now >= endedAt) {
      return { kind: 'wait', stepId: step.id, title: step.title, endedAt, agoMs: now - endedAt };
    }
  }
  return null;
}

/** When the chime and vibration sound: at the end, then every 30 seconds, for 5 minutes. */
export function chimeTimes(endedAt: Instant): Instant[] {
  return Array.from({ length: CHIME_COUNT }, (_, k) => endedAt + k * CHIME_EVERY_MS);
}

/** How many of those have come due by `now`. */
export function chimesDue(endedAt: Instant, now: Instant): number {
  return chimeTimes(endedAt).filter((t) => t <= now).length;
}
