import { describe, expect, it } from 'vitest';
import { parseRequest } from '../../src/domain/request';

const TODAY = '2026-11-15'; // Sunday

describe('parseRequest', () => {
  it('reads a full sentence', () => {
    expect(parseRequest('four 14-inch pizzas for Saturday dinner', TODAY)).toEqual({
      size: 14,
      pizzas: 4,
      day: '2026-11-21',
      time: 'dinner',
      understood: ['4 pizzas', '14"', 'Sat', 'Dinner'],
    });
  });

  it('reads digits, tomorrow and lunch', () => {
    expect(parseRequest('2 pizzas tomorrow lunch', TODAY)).toEqual({
      pizzas: 2,
      day: '2026-11-16',
      time: 'lunch',
      understood: ['2 pizzas', 'Tomorrow', 'Lunch'],
    });
  });

  it('reads a size alone', () => {
    expect(parseRequest('sixteen inch', TODAY)).toEqual({ size: 16, understood: ['16"'] });
  });

  it('reads nothing from "pizza night"', () => {
    expect(parseRequest('pizza night', TODAY)).toEqual({ understood: [] });
  });

  it('keeps the count but not a size that is not offered', () => {
    expect(parseRequest('four 18-inch pizzas', TODAY)).toEqual({ pizzas: 4, understood: ['4 pizzas'] });
    expect(parseRequest('10 inch', TODAY).size).toBeUndefined();
  });

  it('reads number words one to twelve and digits', () => {
    const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    words.forEach((w, i) => {
      expect(parseRequest(`${w} pizzas`, TODAY).pizzas).toBe(i + 1);
      expect(parseRequest(`${i + 1} pizzas`, TODAY).pizzas).toBe(i + 1);
    });
    expect(parseRequest('1 pizza', TODAY).understood).toEqual(['1 pizza']);
    expect(parseRequest('6 dough balls', TODAY).pizzas).toBe(6);
  });

  it('rejects 0 and 13 and over', () => {
    expect(parseRequest('0 pizzas', TODAY).pizzas).toBeUndefined();
    expect(parseRequest('13 pizzas', TODAY).pizzas).toBeUndefined();
    expect(parseRequest('100 pizzas', TODAY).pizzas).toBeUndefined();
  });

  it('reads a count before a size', () => {
    expect(parseRequest('four 14 inch', TODAY)).toMatchObject({ pizzas: 4, size: 14 });
    expect(parseRequest('12 pizzas 12 inch', TODAY)).toMatchObject({ pizzas: 12, size: 12 });
  });

  it('reads size spellings', () => {
    for (const s of ['14 inch', '14-inch', '14in', '14"', 'fourteen inch', '14 inches']) {
      expect(parseRequest(s, TODAY).size, s).toBe(14);
    }
    expect(parseRequest('twelve inch', TODAY).size).toBe(12);
  });

  it('resolves weekdays, full and short, to the next one after today', () => {
    expect(parseRequest('Saturday', TODAY).day).toBe('2026-11-21');
    expect(parseRequest('sat', TODAY).day).toBe('2026-11-21');
    expect(parseRequest('monday', TODAY).day).toBe('2026-11-16');
    expect(parseRequest('Wed', TODAY).day).toBe('2026-11-18');
    expect(parseRequest('this Saturday', TODAY).day).toBe('2026-11-21');
    // the same weekday as today means a week away, still inside the offered window
    expect(parseRequest('Sunday', TODAY).day).toBe('2026-11-22');
  });

  it('crosses month ends', () => {
    expect(parseRequest('tomorrow', '2026-11-30').day).toBe('2026-12-01');
    expect(parseRequest('wednesday', '2026-11-28').day).toBe('2026-12-02');
  });

  it('does not read dates', () => {
    expect(parseRequest('the 21st', TODAY).day).toBeUndefined();
    expect(parseRequest('next month', TODAY).day).toBeUndefined();
  });

  it('reads time words', () => {
    expect(parseRequest('lunchtime', TODAY).time).toBe('lunch');
    expect(parseRequest('early dinner', TODAY).time).toBe('early');
    expect(parseRequest('supper', TODAY).time).toBe('dinner');
    expect(parseRequest('dinner', TODAY).time).toBe('dinner');
  });

  it('reads only the three clock times', () => {
    expect(parseRequest('at 12:30', TODAY).time).toBe('lunch');
    expect(parseRequest('at 6:00', TODAY).time).toBe('early');
    expect(parseRequest('at 6 pm', TODAY).time).toBe('early');
    expect(parseRequest('at 7:30', TODAY).time).toBe('dinner');
    expect(parseRequest('at 8:15', TODAY).time).toBeUndefined();
    expect(parseRequest('at 7:00', TODAY).time).toBeUndefined();
  });

  it('does not take a clock time for a count or size', () => {
    expect(parseRequest('12:30', TODAY)).toEqual({ time: 'lunch', understood: ['Lunch'] });
  });

  it('is case and punctuation tolerant', () => {
    expect(parseRequest('  FOUR 14-INCH Pizzas, for SATURDAY dinner!  ', TODAY)).toMatchObject({
      pizzas: 4,
      size: 14,
      time: 'dinner',
      day: '2026-11-21',
    });
  });

  it('never throws', () => {
    const odd = ['', '   ', 'a'.repeat(100_000), '\u0000\uD800😀', '$&\\(', 'null undefined NaN', '9'.repeat(400) + ' pizzas'];
    for (const s of odd) {
      expect(() => parseRequest(s, TODAY)).not.toThrow();
      expect(parseRequest(s, TODAY).understood).toBeInstanceOf(Array);
    }
    expect(parseRequest('', TODAY)).toEqual({ understood: [] });
    expect(() => parseRequest('tomorrow', 'not a date')).not.toThrow();
    expect(() => parseRequest(undefined as unknown as string, TODAY)).not.toThrow();
  });
});
