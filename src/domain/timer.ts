// Timer state machine. Pure: every function takes `now` and returns a new Timer.
// Times are stored as absolute instants, so a sleeping page never drifts.

import type { Instant } from '../platform/clock';
import type { Step } from './schedule';

const MINUTE_MS = 60_000;

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface Timer {
  stepId: string;
  state: TimerStatus;
  endAt: Instant;
  /** Time left; stored when paused, and the full length at start. */
  remainingMs: number;
  /** True once the alert has been given (or deliberately skipped by finishing early). */
  alerted: boolean;
}

export interface TickResult {
  timer: Timer;
  /** True once, when `now >= endAt` and the alert has not been given. */
  fire: boolean;
  /** How long ago the timer ended, in ms; 0 while it has not ended. */
  lateByMs: number;
}

export function idleTimer(stepId: string): Timer {
  return { stepId, state: 'idle', endAt: 0, remainingMs: 0, alerted: false };
}

/** Only wait steps of 120 minutes or less can have a timer. */
export function startTimer(step: Pick<Step, 'id' | 'kind' | 'long' | 'startAt' | 'endAt'>, now: Instant): Timer {
  const length = step.endAt - step.startAt;
  if (step.kind !== 'wait' || step.long || length > 120 * MINUTE_MS) {
    throw new RangeError(`step "${step.id}" cannot have a timer`);
  }
  return { stepId: step.id, state: 'running', endAt: now + length, remainingMs: length, alerted: false };
}

export function pauseTimer(t: Timer, now: Instant): Timer {
  if (t.state !== 'running') return t;
  return { ...t, state: 'paused', remainingMs: Math.max(0, t.endAt - now) };
}

export function resumeTimer(t: Timer, now: Instant): Timer {
  if (t.state !== 'paused') return t;
  return { ...t, state: 'running', endAt: now + t.remainingMs };
}

export function addMinute(t: Timer): Timer {
  if (t.state === 'running') return { ...t, endAt: t.endAt + MINUTE_MS };
  if (t.state === 'paused') return { ...t, remainingMs: t.remainingMs + MINUTE_MS };
  return t;
}

/** "Finish early": finished at once, with no alert. */
export function finishEarly(t: Timer, now: Instant): Timer {
  if (t.state !== 'running' && t.state !== 'paused') return t;
  return { ...t, state: 'finished', endAt: now, remainingMs: 0, alerted: true };
}

export function tickTimer(t: Timer, now: Instant): TickResult {
  if (t.state === 'running' && now >= t.endAt) {
    const finished: Timer = { ...t, state: 'finished', remainingMs: 0, alerted: true };
    return { timer: finished, fire: !t.alerted, lateByMs: now - t.endAt };
  }
  const lateByMs = t.state === 'finished' ? Math.max(0, now - t.endAt) : 0;
  return { timer: t, fire: false, lateByMs };
}
