import { describe, expect, it } from 'vitest';
import { buildPlan } from '../../src/domain/schedule';
import { diffReminders, desiredReminders, type ReminderInput } from '../../src/domain/reminders';
import { startTimer, pauseTimer, finishEarly } from '../../src/domain/timer';

const MIN = 60_000;
const NOW = new Date(2026, 10, 15, 10, 0).getTime();
const plan = buildPlan({ size: 14, pizzas: 4, day: '2026-11-16', time: 'dinner' }, NOW);
const rest = plan.steps.find((s) => s.id === 'poolish-rest-open')!;
const fridge = plan.steps.find((s) => s.id === 'poolish-fridge')!;
const T0 = NOW + 1000 * MIN;
const fi = plan.steps.findIndex((s) => s.id === fridge.id);
const beforeFridgeDone = Object.fromEntries(plan.steps.slice(0, fi).map((s) => [s.id, s.startAt]));

const base: ReminderInput = {
  steps: plan.steps,
  timer: null,
  doneAt: {},
  snoozes: {},
  currentStepId: null,
  muted: false,
  enabled: true,
  now: T0,
};

describe('desiredReminders', () => {
  it('is empty when notifications are not enabled (off, not granted, or no subscription)', () => {
    expect(desiredReminders({ ...base, enabled: false, timer: startTimer(rest, T0) })).toEqual([]);
  });
  it('includes a running timer at its end time', () => {
    expect(desiredReminders({ ...base, timer: startTimer(rest, T0) })).toEqual([
      { stepId: rest.id, endAt: T0 + 15 * MIN, silent: false },
    ]);
  });
  it('is silent when sound is muted', () => {
    expect(desiredReminders({ ...base, muted: true, timer: startTimer(rest, T0) })[0]!.silent).toBe(true);
  });
  it('leaves out paused, finished early, ended and done timers', () => {
    const running = startTimer(rest, T0);
    expect(desiredReminders({ ...base, timer: pauseTimer(running, T0 + MIN) })).toEqual([]);
    expect(desiredReminders({ ...base, timer: finishEarly(running, T0 + MIN) })).toEqual([]);
    expect(desiredReminders({ ...base, timer: running, now: T0 + 15 * MIN })).toEqual([]);
    expect(desiredReminders({ ...base, timer: running, doneAt: { [rest.id]: T0 + MIN } })).toEqual([]);
  });
  it('includes the long wait once the step before it is done, at its planned end', () => {
    const args = { ...base, currentStepId: fridge.id, doneAt: beforeFridgeDone, now: fridge.startAt };
    expect(desiredReminders(args)).toEqual([{ stepId: fridge.id, endAt: fridge.endAt, silent: false }]);
    expect(desiredReminders({ ...args, doneAt: {} })).toEqual([]);
    expect(desiredReminders({ ...args, doneAt: { ...beforeFridgeDone, [fridge.id]: fridge.startAt } })).toEqual([]);
  });
  it('a snooze moves the long wait to the snooze time', () => {
    const snoozed = fridge.endAt + 20 * MIN;
    const args = { ...base, currentStepId: fridge.id, doneAt: beforeFridgeDone, now: fridge.endAt + 5 * MIN, snoozes: { [fridge.id]: snoozed } };
    expect(desiredReminders(args)).toEqual([{ stepId: fridge.id, endAt: snoozed, silent: false }]);
  });
  it('holds at most two entries', () => {
    const out = desiredReminders({
      ...base,
      timer: startTimer(rest, T0),
      currentStepId: fridge.id,
      doneAt: beforeFridgeDone,
    });
    expect(out.length).toBeLessThanOrEqual(2);
  });
});

describe('diffReminders', () => {
  const a = [{ stepId: 'x', endAt: 1, silent: false }];
  it('says nothing changed for the same set in any order', () => {
    const b = [{ stepId: 'y', endAt: 2, silent: false }, ...a];
    expect(diffReminders(b, [...b].reverse())).toBe(false);
    expect(diffReminders(a, [...a])).toBe(false);
  });
  it('says changed when an end moves, silence flips, or an entry appears or goes', () => {
    expect(diffReminders(a, [{ ...a[0]!, endAt: 2 }])).toBe(true);
    expect(diffReminders(a, [{ ...a[0]!, silent: true }])).toBe(true);
    expect(diffReminders(a, [])).toBe(true);
    expect(diffReminders([], a)).toBe(true);
  });
  it('treats "never sent" (null) as different from an empty set only when there is something to cancel', () => {
    expect(diffReminders(null, [])).toBe(false);
    expect(diffReminders(null, a)).toBe(true);
  });
});
