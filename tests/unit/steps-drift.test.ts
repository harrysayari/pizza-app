import { describe, expect, it } from 'vitest';
import { STEPS } from '../../src/domain/recipe';
import copy from '../../service/src/steps.json';

// The reminder service keeps its own copy of the step ids and titles (service/src/steps.json).
// Regenerate it with `npm run steps` when the recipe changes.
describe('service/src/steps.json', () => {
  it('matches the recipe steps', () => {
    expect(copy).toEqual(STEPS.map((s) => ({ id: s.id, title: s.title })));
  });
});
