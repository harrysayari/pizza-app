import { describe, expect, it } from 'vitest';
import { buildPlan, type Step } from '../../src/domain/schedule';
import {
  addMinute,
  finishEarly,
  idleTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  tickTimer,
} from '../../src/domain/timer';

const MIN = 60_000;
const NOW = new Date(2026, 10, 15, 10, 0).getTime();
const plan = buildPlan({ size: 14, pizzas: 4, day: '2026-11-16', time: 'dinner' }, NOW);
const rest = plan.steps.find((s) => s.id === 'poolish-rest-open')!; // 15 min wait
const T0 = NOW + 1000 * MIN;

describe('startTimer', () => {
  it('runs for the length of the step', () => {
    const t = startTimer(rest, T0);
    expect(t).toEqual({ stepId: 'poolish-rest-open', state: 'running', endAt: T0 + 15 * MIN, remainingMs: 15 * MIN, alerted: false });
  });
  it('starts from idle', () => {
    expect(idleTimer('x').state).toBe('idle');
  });
  it('only wait steps of 120 minutes or less can have a timer', () => {
    const active = plan.steps.find((s) => s.kind === 'active') as Step;
    const fridge = plan.steps.find((s) => s.id === 'poolish-fridge') as Step;
    expect(() => startTimer(active, T0)).toThrow(RangeError);
    expect(() => startTimer(fridge, T0)).toThrow(RangeError);
  });
});

describe('pause and resume', () => {
  it('keeps the remaining time and does not fire while paused', () => {
    const t = pauseTimer(startTimer(rest, T0), T0 + 5 * MIN);
    expect(t.state).toBe('paused');
    expect(t.remainingMs).toBe(10 * MIN);
    const r = tickTimer(t, T0 + 500 * MIN);
    expect(r.fire).toBe(false);
    expect(r.timer.state).toBe('paused');
    expect(r.timer.remainingMs).toBe(10 * MIN);
  });
  it('resumes with the remaining time from the resume instant', () => {
    const p = pauseTimer(startTimer(rest, T0), T0 + 5 * MIN);
    const r = resumeTimer(p, T0 + 60 * MIN);
    expect(r.state).toBe('running');
    expect(r.endAt).toBe(T0 + 70 * MIN);
  });
  it('ignores pause when not running and resume when not paused', () => {
    const t = startTimer(rest, T0);
    expect(resumeTimer(t, T0)).toEqual(t);
    const p = pauseTimer(t, T0);
    expect(pauseTimer(p, T0 + 1)).toEqual(p);
  });
});

describe('addMinute', () => {
  it('moves endAt when running and remainingMs when paused', () => {
    const t = startTimer(rest, T0);
    expect(addMinute(t).endAt).toBe(T0 + 16 * MIN);
    const p = pauseTimer(t, T0 + 5 * MIN);
    expect(addMinute(p).remainingMs).toBe(11 * MIN);
  });
});

describe('tickTimer', () => {
  it('does not fire before endAt', () => {
    const r = tickTimer(startTimer(rest, T0), T0 + 15 * MIN - 1);
    expect(r.fire).toBe(false);
    expect(r.timer.state).toBe('running');
    expect(r.lateByMs).toBe(0);
  });
  it('fires exactly once at endAt', () => {
    const t = startTimer(rest, T0);
    const first = tickTimer(t, T0 + 15 * MIN);
    expect(first.fire).toBe(true);
    expect(first.timer.state).toBe('finished');
    expect(first.timer.alerted).toBe(true);
    const second = tickTimer(first.timer, T0 + 16 * MIN);
    expect(second.fire).toBe(false);
  });
  it('reports lateByMs even a day later', () => {
    const r = tickTimer(startTimer(rest, T0), T0 + 15 * MIN + 24 * 60 * MIN);
    expect(r.fire).toBe(true);
    expect(r.lateByMs).toBe(24 * 60 * MIN);
  });
  it('finish early finishes without an alert and does not fire', () => {
    const f = finishEarly(startTimer(rest, T0), T0 + 3 * MIN);
    expect(f.state).toBe('finished');
    expect(f.alerted).toBe(true);
    expect(tickTimer(f, T0 + 20 * MIN).fire).toBe(false);
  });
});
