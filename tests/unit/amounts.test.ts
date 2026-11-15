import { describe, expect, it } from 'vitest';
import { ballGrams, formatGrams, scaleIngredients } from '../../src/domain/amounts';
import { INGREDIENTS } from '../../src/domain/recipe';

const sum = (xs: { grams: number }[]) => xs.reduce((a, x) => a + x.grams, 0);

describe('scaleIngredients', () => {
  it('returns the reference grams for 1,230 g', () => {
    const out = scaleIngredients(1230);
    expect(out.map((i) => [i.id, i.grams])).toEqual(INGREDIENTS.map((i) => [i.id, i.grams]));
  });

  it('keeps recipe order, group and name', () => {
    const out = scaleIngredients(560);
    expect(out.map((i) => [i.id, i.group, i.name])).toEqual(
      INGREDIENTS.map((i) => [i.id, i.group, i.name]),
    );
  });

  it('gives about 1.1 g of yeast for one 12" pizza', () => {
    const yeast = scaleIngredients(ballGrams(12)).find((i) => i.id === 'p-yeast');
    expect(yeast?.grams).toBeCloseTo(1.1382, 3);
  });

  it('stays exact and positive for 12 x 16" (4,200 g)', () => {
    const out = scaleIngredients(4200);
    expect(sum(out)).toBeCloseTo(4200, 9);
    for (const i of out) {
      expect(Number.isFinite(i.grams)).toBe(true);
      expect(i.grams).toBeGreaterThan(0);
    }
  });
});

describe('ballGrams', () => {
  it('maps sizes to ball weights', () => {
    expect([ballGrams(12), ballGrams(14), ballGrams(16)]).toEqual([280, 310, 350]);
  });
});

describe('every size and count', () => {
  const cases = ([12, 14, 16] as const).flatMap((size) =>
    Array.from({ length: 12 }, (_, n) => [size, n + 1] as const),
  );
  it.each(cases)('%i" x %i sums to the total', (size, count) => {
    const total = ballGrams(size) * count;
    const out = scaleIngredients(total);
    expect(sum(out)).toBeCloseTo(total, 9);
    expect(out.every((i) => i.grams > 0 && Number.isFinite(i.grams))).toBe(true);
  });
  it('covers 36 combinations', () => expect(cases).toHaveLength(36));
});

describe('formatGrams ("whole grams, except under 10 g shown to one decimal")', () => {
  it('shows one decimal under 10 g', () => {
    expect(formatGrams(1.1368)).toBe('1.1 g');
    expect(formatGrams(5)).toBe('5.0 g');
  });
  it('rounds 9.96 up to 10 g', () => expect(formatGrams(9.96)).toBe('10 g'));
  it('shows whole grams from 10 g', () => {
    expect(formatGrams(201.6)).toBe('202 g');
    expect(formatGrams(10)).toBe('10 g');
  });
});
