import { describe, expect, it } from 'vitest';
import { progressCrumbs, stepTimeText } from '../../src/domain/progress';
import { buildPlan } from '../../src/domain/schedule';

const MIN = 60_000;
const NOW = new Date(2026, 10, 15, 10, 0).getTime();
const plan = buildPlan({ size: 14, pizzas: 4, day: '2026-11-21', time: 'dinner' }, NOW);
const at = (id: string): number => plan.steps.findIndex((s) => s.id === id);

describe('progressCrumbs (the breadcrumb on the step screen)', () => {
  it('names the four parts of the schedule: Poolish, Rest, Final dough, Final rest', () => {
    expect(progressCrumbs(plan, 0).map((c) => c.label)).toEqual(['Poolish', 'Rest', 'Final dough', 'Final rest']);
  });

  it('marks the first part as now and the others as next on the first step', () => {
    expect(progressCrumbs(plan, 0).map((c) => c.state)).toEqual(['now', 'next', 'next', 'next']);
  });

  it('marks earlier parts done and later ones next, following the current step', () => {
    expect(progressCrumbs(plan, at('poolish-fridge')).map((c) => c.state)).toEqual(['done', 'now', 'next', 'next']);
    expect(progressCrumbs(plan, at('final-mix')).map((c) => c.state)).toEqual(['done', 'done', 'now', 'next']);
    expect(progressCrumbs(plan, at('final-proof')).map((c) => c.state)).toEqual(['done', 'done', 'done', 'now']);
  });

  it('marks every part done once all steps are finished', () => {
    expect(progressCrumbs(plan, plan.steps.length).map((c) => c.state)).toEqual(['done', 'done', 'done', 'done']);
  });
});

describe('stepTimeText (the time shown on the current part)', () => {
  it('shows the planned length before the step starts', () => {
    expect(stepTimeText({ plannedMinutes: 15, timer: 'idle', remainingMs: 15 * MIN })).toBe('15 min');
    expect(stepTimeText({ plannedMinutes: 1080, timer: 'idle', remainingMs: 0 })).toBe('18 hr');
  });
  it('shows the time left while a timer runs or is paused, rounded up to whole minutes', () => {
    expect(stepTimeText({ plannedMinutes: 15, timer: 'running', remainingMs: 10 * MIN })).toBe('10 min more');
    expect(stepTimeText({ plannedMinutes: 15, timer: 'running', remainingMs: 9 * MIN + 1 })).toBe('10 min more');
    expect(stepTimeText({ plannedMinutes: 15, timer: 'paused', remainingMs: 4 * MIN })).toBe('4 min more');
  });
  it('says "under 1 min more" in the last minute and "Time is up" when finished', () => {
    expect(stepTimeText({ plannedMinutes: 15, timer: 'running', remainingMs: 20_000 })).toBe('under 1 min more');
    expect(stepTimeText({ plannedMinutes: 15, timer: 'finished', remainingMs: 0 })).toBe('Time is up');
  });
});
