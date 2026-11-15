import { describe, expect, it } from 'vitest';
import { TIME_CHOICES } from '../../src/domain/recipe';
import { earliestReady } from '../../src/domain/earliest';
import { buildPlan, minimumLeadMinutes, type Request } from '../../src/domain/schedule';

const MIN = 60_000;
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
const FRI_18 = at(20, 18); // Friday 20 Nov 2026, 18:00 local
const SAT = '2026-11-21';

function req(over: Partial<Request> = {}): Request {
  return { size: 14, pizzas: 4, day: SAT, time: 'lunch', ...over };
}

describe('earliestReady', () => {
  it('on Friday 18:00 returns Saturday early dinner (lunch is too soon, early dinner fits)', () => {
    const e = earliestReady(FRI_18, '2026-11-20');
    expect(e.day).toBe(SAT);
    expect(e.time.id).toBe('early');
    expect(e.bakeAt).toBe(at(21, 18));
  });

  it('picks the first slot among lunch, early dinner and dinner that fits a 960 minute fridge', () => {
    // 10:00 Friday: Saturday lunch (12:30) is 1590 min away, which fits.
    const e = earliestReady(at(20, 10), '2026-11-20');
    expect(e).toMatchObject({ day: SAT, bakeAt: at(21, 12, 30) });
    expect(e.time).toEqual(TIME_CHOICES[0]);
  });

  it('accepts a slot exactly at the minimum lead and rejects one a minute short', () => {
    expect(minimumLeadMinutes()).toBe(1313);
    const exact = at(21, 12, 30) - 1313 * MIN;
    expect(earliestReady(exact, '2026-11-20').bakeAt).toBe(at(21, 12, 30));
    expect(earliestReady(exact + MIN, '2026-11-20').bakeAt).toBe(at(21, 18));
  });

  it('late in the evening skips tomorrow dinner and lands on the day after', () => {
    const e = earliestReady(at(20, 23, 59), '2026-11-20');
    expect(e.day).toBe('2026-11-22');
    expect(e.time.id).toBe('lunch');
  });

  it('always returns a slot buildPlan accepts and calls ok', () => {
    for (let h = 0; h < 24; h++) {
      const now = at(20, h, 17);
      const e = earliestReady(now, '2026-11-20');
      const plan = buildPlan({ size: 14, pizzas: 4, day: e.day, time: e.time.id }, now);
      expect(plan.status).toBe('ok');
    }
  });
});

describe('buildPlan too soon', () => {
  it('Saturday lunch on Friday 18:00 is tooSoon and carries the earliest slot', () => {
    const p = buildPlan(req(), FRI_18);
    expect(p.status).toBe('tooSoon');
    expect(p.earliest).toEqual({ day: SAT, time: 'early' });
    expect(p.fridgeMinutes).toBe(960);
  });

  it('an ok plan has earliest null', () => {
    const p = buildPlan(req({ time: 'dinner' }), at(19, 10));
    expect(p.status).toBe('ok');
    expect(p.earliest).toBeNull();
  });

  it('a bake exactly at the minimum lead is ok, one minute less is tooSoon', () => {
    const bake = at(21, 12, 30);
    const ok = buildPlan(req(), bake - 1313 * MIN);
    expect(ok.status).toBe('ok');
    expect(ok.fridgeMinutes).toBe(960);
    expect(ok.steps[0]!.startAt).toBe(bake - 1313 * MIN);
    const soon = buildPlan(req(), bake - 1313 * MIN + MIN);
    expect(soon.status).toBe('tooSoon');
    expect(soon.earliest).not.toBeNull();
  });

  it('shortens the fridge from 1080 toward 960 before reporting tooSoon', () => {
    // Saturday early dinner (18:00) from Friday 18:30 leaves 1410 min; 1080 needs 1433, so shorten by 23.
    const p = buildPlan(req({ time: 'early' }), at(20, 18, 30));
    expect(p.status).toBe('ok');
    expect(p.fridgeMinutes).toBe(1057);
    expect(p.steps[0]!.startAt).toBeGreaterThanOrEqual(at(20, 18, 30));
    expect(p.steps.at(-1)!.endAt).toBe(p.bakeAt);
  });

  it('keeps 1080 when the first step is not in the past', () => {
    expect(buildPlan(req({ time: 'dinner' }), at(19, 10)).fridgeMinutes).toBe(1080);
  });

  it('treats a first step already in the past as tooSoon', () => {
    const now = at(20, 23, 0);
    const p = buildPlan(req({ time: 'lunch' }), now);
    expect(p.steps[0]!.startAt).toBeLessThan(now);
    expect(p.status).toBe('tooSoon');
    expect(p.earliest).not.toBeNull();
  });
});
