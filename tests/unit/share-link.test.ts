import { describe, expect, it } from 'vitest';
import { readLink, writeLink } from '../../src/state/share-link';

// Sunday 15 Nov 2026. Tomorrow is the 16th; tomorrow plus six days is the 22nd.
const TODAY = '2026-11-15';
const BASE = 'https://pizza.example/';

describe('readLink', () => {
  it('reads all four params', () => {
    expect(readLink(`${BASE}?s=14&n=4&d=2026-11-21&t=dinner`, TODAY)).toEqual({
      size: 14,
      pizzas: 4,
      day: '2026-11-21',
      time: 'dinner',
    });
  });

  it('returns nothing when there are no params', () => {
    expect(readLink(BASE, TODAY)).toEqual({});
  });

  it('ignores invalid values without touching the others', () => {
    expect(readLink(`${BASE}?s=13&n=4&d=2026-11-21&t=brunch`, TODAY)).toEqual({ pizzas: 4, day: '2026-11-21' });
    expect(readLink(`${BASE}?s=16&n=0`, TODAY)).toEqual({ size: 16 });
    expect(readLink(`${BASE}?n=13`, TODAY)).toEqual({});
    expect(readLink(`${BASE}?n=2.5`, TODAY)).toEqual({});
    expect(readLink(`${BASE}?n=abc&d=nope`, TODAY)).toEqual({});
    expect(readLink(`${BASE}?d=2026-02-30`, TODAY)).toEqual({});
  });

  it('accepts the whole window: tomorrow up to six days after tomorrow', () => {
    expect(readLink(`${BASE}?d=2026-11-16`, TODAY)).toEqual({ day: '2026-11-16' });
    expect(readLink(`${BASE}?d=2026-11-22`, TODAY)).toEqual({ day: '2026-11-22' });
  });

  it('ignores a past d, or one more than six days after tomorrow, while the other choices still apply', () => {
    expect(readLink(`${BASE}?s=12&d=2026-11-14&t=lunch`, TODAY)).toEqual({ size: 12, time: 'lunch' });
    expect(readLink(`${BASE}?s=12&d=2026-11-15&t=lunch`, TODAY)).toEqual({ size: 12, time: 'lunch' });
    expect(readLink(`${BASE}?s=12&d=2026-11-23&t=lunch`, TODAY)).toEqual({ size: 12, time: 'lunch' });
  });

  it('does not throw on a bad address', () => {
    expect(readLink('not a url', TODAY)).toEqual({});
    expect(readLink('', TODAY)).toEqual({});
  });

  it('accepts a bare query string too', () => {
    expect(readLink('?s=16&n=2', TODAY)).toEqual({ size: 16, pizzas: 2 });
  });
});

describe('writeLink', () => {
  it('writes only the request', () => {
    const url = writeLink({ size: 14, pizzas: 4, day: '2026-11-21', time: 'dinner' }, BASE);
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://pizza.example/');
    expect([...u.searchParams.keys()].sort()).toEqual(['d', 'n', 's', 't']);
    expect(u.searchParams.get('s')).toBe('14');
    expect(u.searchParams.get('n')).toBe('4');
    expect(u.searchParams.get('d')).toBe('2026-11-21');
    expect(u.searchParams.get('t')).toBe('dinner');
  });

  it('replaces any query already on the base, and round-trips', () => {
    const request = { size: 16 as const, pizzas: 12, day: '2026-11-18', time: 'early' as const };
    const url = writeLink(request, `${BASE}?junk=1#x`);
    expect(url).not.toContain('junk');
    expect(url).not.toContain('#');
    expect(readLink(url, TODAY)).toEqual(request);
  });
});
