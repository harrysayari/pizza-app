import { describe, expect, it } from 'vitest';
import { estimateReady } from '../../src/domain/estimate';
import { buildPlan } from '../../src/domain/schedule';

const MIN = 60_000;
const NOW = new Date(2026, 10, 15, 10, 0).getTime();
const plan = buildPlan({ size: 14, pizzas: 4, day: '2026-11-16', time: 'dinner' }, NOW);
const doneOnTime = (n: number): Record<string, number> =>
  Object.fromEntries(plan.steps.slice(0, n).map((s) => [s.id, s.endAt]));

describe('estimateReady', () => {
  it('equals bakeAt with nothing done yet and the first step not yet due', () => {
    expect(estimateReady(plan, {}, NOW)).toEqual({ readyAt: plan.bakeAt, minutesBehind: 0 });
  });
  it('equals bakeAt when every step is done on time', () => {
    const r = estimateReady(plan, doneOnTime(14), plan.bakeAt);
    expect(r).toEqual({ readyAt: plan.bakeAt, minutesBehind: 0 });
    expect(estimateReady(plan, doneOnTime(5), plan.steps[4]!.endAt).minutesBehind).toBe(0);
  });
  it('is 25 minutes behind when one step finishes 25 minutes late', () => {
    const done = doneOnTime(3);
    done[plan.steps[2]!.id] = plan.steps[2]!.endAt + 25 * MIN;
    const r = estimateReady(plan, done, plan.steps[2]!.endAt + 26 * MIN);
    expect(r.readyAt).toBe(plan.bakeAt + 25 * MIN);
    expect(r.minutesBehind).toBe(25);
  });
  it('goes negative when finishing early', () => {
    const done = doneOnTime(2);
    done[plan.steps[1]!.id] = plan.steps[1]!.endAt - 10 * MIN;
    const r = estimateReady(plan, done, plan.steps[1]!.endAt - 9 * MIN);
    expect(r.readyAt).toBe(plan.bakeAt - 10 * MIN);
    expect(r.minutesBehind).toBe(-10);
  });
  it('counts a first step that has not been done once its start has passed', () => {
    const now = plan.steps[0]!.startAt + 30 * MIN;
    expect(estimateReady(plan, {}, now).minutesBehind).toBeGreaterThan(0);
  });
  it('never changes the planned step times', () => {
    const before = JSON.stringify(plan.steps);
    estimateReady(plan, { [plan.steps[0]!.id]: plan.steps[0]!.endAt + 25 * MIN }, NOW);
    expect(JSON.stringify(plan.steps)).toBe(before);
  });
});
