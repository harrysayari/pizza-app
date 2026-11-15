import { describe, expect, it } from 'vitest';
import { activeAlert, chimeTimes, chimesDue, SNOOZE_MS } from '../../src/domain/alert';
import { buildPlan } from '../../src/domain/schedule';
import { finishEarly, startTimer, tickTimer, type Timer } from '../../src/domain/timer';

const MIN = 60_000;
const NOW = new Date(2026, 10, 15, 10, 0).getTime();
const plan = buildPlan({ size: 14, pizzas: 4, day: '2026-11-16', time: 'dinner' }, NOW);
const rest = plan.steps.find((s) => s.id === 'poolish-rest-open')!; // 15 min wait
const fridge = plan.steps.find((s) => s.id === 'poolish-fridge')!; // the long wait
const T0 = NOW + 1000 * MIN;

const base = { steps: plan.steps, doneAt: {}, snoozes: {}, currentStepId: null as string | null };

describe('activeAlert for a timer', () => {
  const running = startTimer(rest, T0);
  const ended = tickTimer(running, T0 + 15 * MIN).timer;

  it('is none while the timer is running and not yet due', () => {
    expect(activeAlert({ ...base, timer: running, now: T0 + 14 * MIN })).toBeNull();
  });
  it('appears at the end time, naming the step', () => {
    const a = activeAlert({ ...base, timer: running, now: T0 + 15 * MIN });
    expect(a).toMatchObject({ kind: 'timer', stepId: 'poolish-rest-open', title: rest.title, endedAt: T0 + 15 * MIN, agoMs: 0 });
  });
  it('stays after the timer is marked finished, with how long ago it ended', () => {
    const a = activeAlert({ ...base, timer: ended, now: T0 + 18 * MIN });
    expect(a).toMatchObject({ kind: 'timer', agoMs: 3 * MIN });
  });
  it('is none after finishing early (no alert is wanted)', () => {
    const early = finishEarly(running, T0 + 5 * MIN);
    expect(activeAlert({ ...base, timer: early, now: T0 + 30 * MIN })).toBeNull();
  });
  it('is none once the step is marked done', () => {
    expect(activeAlert({ ...base, timer: ended, doneAt: { [rest.id]: T0 + 16 * MIN }, now: T0 + 17 * MIN })).toBeNull();
  });
  it('is none when the timer is paused or there is no timer', () => {
    const paused: Timer = { ...running, state: 'paused', remainingMs: 3 * MIN };
    expect(activeAlert({ ...base, timer: paused, now: T0 + 99 * MIN })).toBeNull();
    expect(activeAlert({ ...base, timer: null, now: T0 })).toBeNull();
  });
});

describe('activeAlert for a long wait', () => {
  const i = plan.steps.findIndex((s) => s.id === fridge.id);
  const prevDone = Object.fromEntries(plan.steps.slice(0, i).map((s) => [s.id, s.startAt]));
  const args = { ...base, timer: null, currentStepId: fridge.id, doneAt: prevDone };

  it('appears at the planned end when the wait is the current step', () => {
    expect(activeAlert({ ...args, now: fridge.endAt - 1 })).toBeNull();
    expect(activeAlert({ ...args, now: fridge.endAt + 2 * MIN })).toMatchObject({
      kind: 'wait',
      stepId: fridge.id,
      endedAt: fridge.endAt,
      agoMs: 2 * MIN,
    });
  });
  it('is none when the wait is not the current step or the step before is not done', () => {
    expect(activeAlert({ ...args, currentStepId: plan.steps[0]!.id, now: fridge.endAt + MIN })).toBeNull();
    expect(activeAlert({ ...args, doneAt: {}, now: fridge.endAt + MIN })).toBeNull();
  });
  it('is none once the wait is marked done', () => {
    expect(activeAlert({ ...args, doneAt: { ...prevDone, [fridge.id]: fridge.endAt + MIN }, now: fridge.endAt + 2 * MIN })).toBeNull();
  });
  it('a snooze moves the alert 15 minutes later', () => {
    const snoozes = { [fridge.id]: fridge.endAt + 3 * MIN + SNOOZE_MS };
    expect(activeAlert({ ...args, snoozes, now: fridge.endAt + 10 * MIN })).toBeNull();
    expect(activeAlert({ ...args, snoozes, now: snoozes[fridge.id]! })).toMatchObject({ kind: 'wait', endedAt: snoozes[fridge.id] });
  });
});

describe('chimes', () => {
  it('repeat every 30 seconds for 5 minutes, then stop', () => {
    const t = chimeTimes(1000);
    expect(t).toHaveLength(10);
    expect(t[0]).toBe(1000);
    expect(t[1]).toBe(31_000);
    expect(t[9]).toBe(1000 + 9 * 30_000);
  });
  it('counts how many are due', () => {
    expect(chimesDue(1000, 999)).toBe(0);
    expect(chimesDue(1000, 1000)).toBe(1);
    expect(chimesDue(1000, 30_999)).toBe(1);
    expect(chimesDue(1000, 31_000)).toBe(2);
    expect(chimesDue(1000, 1000 + 5 * MIN - 1)).toBe(10);
    expect(chimesDue(1000, 1000 + 60 * MIN)).toBe(10);
  });
});
