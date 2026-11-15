import { describe, expect, it } from 'vitest';
import { INGREDIENTS, SIZES, STEPS, TIME_CHOICES, isLongWait } from '../../src/domain/recipe';

describe('recipe constants (data-model.md)', () => {
  it('has ball weights and time choices', () => {
    expect(SIZES).toEqual({ 12: 280, 14: 310, 16: 350 });
    expect(TIME_CHOICES.map((t) => [t.id, t.time])).toEqual([
      ['lunch', '12:30'],
      ['early', '18:00'],
      ['dinner', '19:30'],
    ]);
  });

  it('has eight ingredients totalling 1230 g', () => {
    expect(INGREDIENTS).toHaveLength(8);
    expect(INGREDIENTS.reduce((a, i) => a + i.grams, 0)).toBe(1230);
  });

  it('has 14 steps with the planned minutes', () => {
    expect(STEPS).toHaveLength(14);
    expect(STEPS.map((s) => s.minutes)).toEqual([3, 15, 60, 1080, 60, 5, 5, 15, 10, 15, 5, 60, 10, 90]);
    expect(STEPS[3]?.range).toEqual([960, 1440]);
    expect(STEPS[13]?.range).toEqual([60, 120]);
  });

  it('flags only the fridge step as a long wait', () => {
    expect(STEPS.filter(isLongWait).map((s) => s.id)).toEqual(['poolish-fridge']);
  });

  it('references only known ingredients and has text for each step', () => {
    const ids = new Set(INGREDIENTS.map((i) => i.id));
    for (const s of STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.instruction.length).toBeGreaterThan(0);
      for (const u of s.uses) expect(ids.has(u)).toBe(true);
    }
  });
});
