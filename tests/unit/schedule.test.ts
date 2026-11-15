import { afterEach, describe, expect, it } from 'vitest';
import { STEPS, type PizzaSize, type TimeChoiceId } from '../../src/domain/recipe';
import { buildPlan, minimumLeadMinutes, type Request } from '../../src/domain/schedule';

// No @types/node in this project; only the TZ variable is used, to test daylight saving.
declare const process: { env: Record<string, string | undefined> };

const MIN = 60_000;
const NOW = new Date(2026, 10, 15, 10, 0).getTime(); // Sunday 15 Nov 2026, 10:00 local
const SAT = '2026-11-21';

function req(over: Partial<Request> = {}): Request {
  return { size: 14, pizzas: 4, day: SAT, time: 'dinner', ...over };
}

function minutesOf(id: string, fridge: number): number {
  return id === 'poolish-fridge' ? fridge : STEPS.find((r) => r.id === id)!.minutes;
}

describe('buildPlan', () => {
  it('returns the same plan for the same request and now', () => {
    expect(buildPlan(req(), NOW)).toEqual(buildPlan(req(), NOW));
  });

  it('sets bakeAt for Saturday dinner to 19:30 local', () => {
    expect(buildPlan(req(), NOW).bakeAt).toBe(new Date(2026, 10, 21, 19, 30).getTime());
    expect(buildPlan(req({ time: 'lunch' }), NOW).bakeAt).toBe(new Date(2026, 10, 21, 12, 30).getTime());
    expect(buildPlan(req({ time: 'early' }), NOW).bakeAt).toBe(new Date(2026, 10, 21, 18, 0).getTime());
  });

  it('ends the last step at bakeAt and chains every step', () => {
    const p = buildPlan(req(), NOW);
    expect(p.steps).toHaveLength(STEPS.length);
    expect(p.steps.at(-1)!.endAt).toBe(p.bakeAt);
    for (let i = 0; i < p.steps.length - 1; i++) {
      expect(p.steps[i]!.endAt).toBe(p.steps[i + 1]!.startAt);
    }
    for (const s of p.steps) expect(s.endAt).toBeGreaterThan(s.startAt);
  });

  it('keeps the fridge at 1080 minutes when the bake is far away', () => {
    const p = buildPlan(req({ day: '2026-11-22' }), NOW);
    expect(p.fridgeMinutes).toBe(1080);
    expect(Number.isInteger(p.fridgeMinutes)).toBe(true);
    expect(p.status).toBe('ok');
    expect(p.earliest).toBeNull();
  });

  it('honours a fridgeMinutes option within 960 to 1440 and rejects others', () => {
    expect(buildPlan(req(), NOW, { fridgeMinutes: 960 }).fridgeMinutes).toBe(960);
    expect(buildPlan(req(), NOW, { fridgeMinutes: 1440 }).fridgeMinutes).toBe(1440);
    expect(() => buildPlan(req(), NOW, { fridgeMinutes: 959 })).toThrow(RangeError);
    expect(() => buildPlan(req(), NOW, { fridgeMinutes: 1441 })).toThrow(RangeError);
    expect(() => buildPlan(req(), NOW, { fridgeMinutes: 1000.5 })).toThrow(RangeError);
  });

  it('gives 310 g balls and 1240 g total for 14 inch x 4', () => {
    const p = buildPlan(req(), NOW);
    expect(p.ballGrams).toBe(310);
    expect(p.totalGrams).toBe(1240);
  });

  it('gives 4200 g and 14 steps for 12 x 16 inch', () => {
    const p = buildPlan(req({ size: 16, pizzas: 12 }), NOW);
    expect(p.totalGrams).toBe(4200);
    expect(p.steps).toHaveLength(14);
  });

  it('builds a valid plan for all 36 size and count combinations', () => {
    for (const size of [12, 14, 16] as PizzaSize[]) {
      for (let pizzas = 1; pizzas <= 12; pizzas++) {
        const p = buildPlan(req({ size, pizzas }), NOW);
        expect(p.totalGrams).toBe(pizzas * p.ballGrams);
        expect(p.steps).toHaveLength(14);
        expect(p.steps.at(-1)!.endAt).toBe(p.bakeAt);
        expect(p.fridgeMinutes).toBeGreaterThanOrEqual(960);
        expect(p.fridgeMinutes).toBeLessThanOrEqual(1440);
      }
    }
  });

  it('puts scaled amounts on the steps that use ingredients', () => {
    const p = buildPlan(req(), NOW);
    const mix = p.steps.find((s) => s.id === 'poolish-mix')!;
    expect(mix.amounts.map((a) => a.id)).toEqual(['p-water', 'p-honey', 'p-yeast', 'p-flour']);
    expect(mix.amounts[0]!.grams).toBeCloseTo((200 * 1240) / 1230, 10);
    expect(p.steps.find((s) => s.id === 'final-mix')!.amounts).toEqual([]);
  });

  it('marks only the fridge step as long and starts with doneAt null', () => {
    const p = buildPlan(req(), NOW);
    expect(p.steps.filter((s) => s.long).map((s) => s.id)).toEqual(['poolish-fridge']);
    expect(p.steps.every((s) => s.doneAt === null)).toBe(true);
  });

  it('is tooSoon only when the minimum lead does not fit', () => {
    const bake = new Date(2026, 10, 21, 19, 30).getTime();
    expect(buildPlan(req(), bake - minimumLeadMinutes() * MIN).status).toBe('ok');
    expect(buildPlan(req(), bake - minimumLeadMinutes() * MIN + MIN).status).toBe('tooSoon');
  });

  it('rejects values outside the request rules', () => {
    expect(() => buildPlan(req({ pizzas: 0 }), NOW)).toThrow(RangeError);
    expect(() => buildPlan(req({ pizzas: 13 }), NOW)).toThrow(RangeError);
    expect(() => buildPlan(req({ pizzas: 2.5 }), NOW)).toThrow(RangeError);
    expect(() => buildPlan(req({ size: 13 as PizzaSize }), NOW)).toThrow(RangeError);
    expect(() => buildPlan(req({ time: 'brunch' as TimeChoiceId }), NOW)).toThrow(RangeError);
    expect(() => buildPlan(req({ day: '2026-11-15' }), NOW)).toThrow(RangeError); // today
    expect(() => buildPlan(req({ day: '2026-11-23' }), NOW)).toThrow(RangeError); // beyond a week
    expect(() => buildPlan(req({ day: 'saturday' }), NOW)).toThrow(RangeError);
    expect(() => buildPlan(req({ day: '2026-11-16' }), NOW)).not.toThrow(); // tomorrow
    expect(() => buildPlan(req({ day: '2026-11-22' }), NOW)).not.toThrow(); // seventh day
  });
});

describe('minimumLeadMinutes', () => {
  it('is 1313 at default durations', () => {
    expect(minimumLeadMinutes()).toBe(1313);
  });
});

describe('daylight saving', () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  // Clocks go back on Sun 25 Oct 2026 in London and Sun 1 Nov 2026 in New York. Each plan spans it.
  const cases: Array<{ tz: string; today: [number, number, number]; bake: [number, number, number] }> = [
    { tz: 'Europe/London', today: [2026, 9, 23], bake: [2026, 9, 25] },
    { tz: 'America/New_York', today: [2026, 9, 30], bake: [2026, 10, 1] },
  ];

  for (const c of cases) {
    it(`uses absolute durations across the change in ${c.tz}`, () => {
      process.env.TZ = c.tz;
      const now = new Date(c.today[0], c.today[1], c.today[2], 9, 0).getTime();
      const day = `${c.bake[0]}-${String(c.bake[1] + 1).padStart(2, '0')}-${String(c.bake[2]).padStart(2, '0')}`;
      const p = buildPlan(req({ day, time: 'dinner' }), now);
      expect(p.bakeAt).toBe(new Date(c.bake[0], c.bake[1], c.bake[2], 19, 30).getTime());
      const total = STEPS.reduce((n, s) => n + minutesOf(s.id, 1080), 0);
      expect(p.bakeAt - p.steps[0]!.startAt).toBe(total * MIN);
      for (const s of p.steps) expect(s.endAt - s.startAt).toBe(minutesOf(s.id, 1080) * MIN);
    });
  }
});
