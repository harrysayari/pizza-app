import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPlan } from '../../src/domain/schedule';
import { planFromSaved, stepsFromSaved } from '../../src/domain/saved';
import { clearAll, clearPlan, flush, load, save, STORAGE_KEY } from '../../src/state/persistence';
import { clearSavedData, startNewPlan } from '../../src/state/hydrate';
import { createStore, initialState, type AppState } from '../../src/state/store';

const NOW = new Date(2026, 10, 15, 10, 0).getTime();
const clock = { now: () => NOW };

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string): string | null {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.data.set(k, v);
  }
  removeItem(k: string): void {
    this.data.delete(k);
  }
}

class ThrowingStorage {
  getItem(): string | null {
    throw new Error('blocked');
  }
  setItem(): void {
    throw new Error('quota');
  }
  removeItem(): void {
    throw new Error('blocked');
  }
}

const request = { size: 14 as const, pizzas: 4, day: '2026-11-21', time: 'dinner' as const };

function fullState(): AppState {
  const plan = buildPlan(request, NOW);
  return {
    ...initialState(),
    request,
    bakeAt: plan.bakeAt,
    fridgeMinutes: plan.fridgeMinutes,
    plan,
    ticked: { 'p-water': true, 'f-salt': true },
    doneAt: { 'poolish-mix': NOW + 60_000 },
    timer: { stepId: 'poolish-rest-open', state: 'running', endAt: NOW + 900_000, remainingMs: 900_000, alerted: false },
    preferences: { muted: true, keepScreenOn: false, theme: 'dark' },
    progress: { screen: 'steps', currentStepId: 'poolish-rest-open' },
  };
}

let storage: MemoryStorage;
const env = () => ({ storage, clock });

beforeEach(() => {
  storage = new MemoryStorage();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('save and load', () => {
  it('round-trips a full state', () => {
    const s = fullState();
    save(s, env());
    flush();
    const loaded = load(env());
    expect(loaded).not.toBeNull();
    expect(loaded!.request).toEqual(s.request);
    expect(loaded!.bakeAt).toBe(s.bakeAt);
    expect(loaded!.fridgeMinutes).toBe(s.fridgeMinutes);
    expect(loaded!.ticked).toEqual(s.ticked);
    expect(loaded!.doneAt).toEqual(s.doneAt);
    expect(loaded!.timer).toEqual(s.timer);
    expect(loaded!.preferences).toEqual(s.preferences);
    expect(loaded!.progress).toEqual(s.progress);
  });

  it('writes the contract shape under pdp:v1, with ISO instants and no step list', () => {
    save(fullState(), env());
    flush();
    expect(STORAGE_KEY).toBe('pdp:v1');
    const raw = JSON.parse(storage.getItem('pdp:v1')!);
    expect(raw.version).toBe(1);
    expect(raw.request).toEqual(request);
    expect(typeof raw.bakeAt).toBe('string');
    expect(new Date(raw.bakeAt).getTime()).toBe(fullState().bakeAt);
    expect(raw.savedAt).toBe(new Date(NOW).toISOString());
    expect([...raw.ticked].sort()).toEqual(['f-salt', 'p-water']);
    expect(raw.steps).toBeUndefined();
    expect(raw.plan).toBeUndefined();
  });

  it('debounces: nothing is written until the delay passes or flush is called', () => {
    vi.useFakeTimers();
    save(fullState(), env());
    expect(storage.getItem('pdp:v1')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(storage.getItem('pdp:v1')).not.toBeNull();
  });

  it('loads as empty when missing, invalid, or of an unknown version', () => {
    expect(load(env())).toBeNull();
    storage.setItem('pdp:v1', '{not json');
    expect(load(env())).toBeNull();
    storage.setItem('pdp:v1', '"a string"');
    expect(load(env())).toBeNull();
    storage.setItem(
      'pdp:v1',
      JSON.stringify({ version: 2, preferences: { muted: false, keepScreenOn: true, theme: 'system' } }),
    );
    expect(load(env())).toBeNull();
    storage.setItem('pdp:v1', JSON.stringify({ version: 1 }));
    expect(load(env())).toBeNull();
  });

  it('drops invalid sections but keeps the valid ones, and ignores unknown fields', () => {
    storage.setItem(
      'pdp:v1',
      JSON.stringify({
        version: 1,
        future: { anything: true },
        request: { size: 13, pizzas: 4, day: '2026-11-21', time: 'dinner' },
        bakeAt: 'not a date',
        timer: { stepId: 5, state: 'running' },
        ticked: ['p-water', 7],
        preferences: { muted: true, keepScreenOn: true, theme: 'dark', extra: 1 },
      }),
    );
    const loaded = load(env());
    expect(loaded).not.toBeNull();
    expect(loaded!.request).toBeNull();
    expect(loaded!.bakeAt).toBeNull();
    expect(loaded!.timer).toBeNull();
    expect(loaded!.ticked).toEqual({ 'p-water': true });
    expect(loaded!.preferences).toEqual({ muted: true, keepScreenOn: true, theme: 'dark' });
  });

  it('survives a storage that throws on every call', () => {
    const bad = { storage: new ThrowingStorage(), clock };
    expect(() => save(fullState(), bad)).not.toThrow();
    expect(() => flush()).not.toThrow();
    expect(load(bad)).toBeNull();
    expect(() => clearPlan(bad)).not.toThrow();
    expect(() => clearAll(bad)).not.toThrow();
  });

  it('survives no storage at all', () => {
    const none = { storage: null, clock };
    expect(() => save(fullState(), none)).not.toThrow();
    expect(() => flush()).not.toThrow();
    expect(load(none)).toBeNull();
  });

  it('an empty state with default preferences stores nothing', () => {
    save(fullState(), env());
    flush();
    save(initialState(), env());
    flush();
    expect(storage.getItem('pdp:v1')).toBeNull();
  });
});

describe('clearing', () => {
  it('clearPlan keeps preferences and drops everything else', () => {
    save(fullState(), env());
    flush();
    clearPlan(env());
    const loaded = load(env());
    expect(loaded).not.toBeNull();
    expect(loaded!.preferences).toEqual({ muted: true, keepScreenOn: false, theme: 'dark' });
    expect(loaded!.request).toBeNull();
    expect(loaded!.bakeAt).toBeNull();
    expect(loaded!.fridgeMinutes).toBeNull();
    expect(loaded!.ticked).toEqual({});
    expect(loaded!.doneAt).toEqual({});
    expect(loaded!.timer).toBeNull();
    expect(loaded!.progress.screen).toBe('plan');
  });

  it('clearAll removes everything including preferences', () => {
    save(fullState(), env());
    flush();
    clearAll(env());
    expect(storage.getItem('pdp:v1')).toBeNull();
    expect(load(env())).toBeNull();
  });

  it('a pending debounced save does not come back after a clear', () => {
    vi.useFakeTimers();
    save(fullState(), env());
    clearAll(env());
    vi.advanceTimersByTime(2000);
    expect(storage.getItem('pdp:v1')).toBeNull();
  });

  it('startNewPlan clears the plan and keeps preferences in the store', () => {
    const store = createStore(fullState());
    startNewPlan(store, env());
    const s = store.getState();
    expect(s.request).toBeNull();
    expect(s.plan).toBeNull();
    expect(s.bakeAt).toBeNull();
    expect(s.fridgeMinutes).toBeNull();
    expect(s.ticked).toEqual({});
    expect(s.doneAt).toEqual({});
    expect(s.timer).toBeNull();
    expect(s.progress).toEqual({ screen: 'plan', currentStepId: null });
    expect(s.preferences).toEqual({ muted: true, keepScreenOn: false, theme: 'dark' });
  });

  it('clearSavedData resets the store, preferences included, and removes the stored object', () => {
    const store = createStore(fullState());
    save(store.getState(), env());
    flush();
    clearSavedData(store, env());
    expect(store.getState()).toEqual(initialState());
    expect(storage.getItem('pdp:v1')).toBeNull();
  });
});

describe('rebuilding the plan from saved inputs', () => {
  it('rebuilds the same steps as buildPlan from request, bakeAt and fridgeMinutes', () => {
    const plan = buildPlan(request, NOW);
    const steps = stepsFromSaved({ request, bakeAt: plan.bakeAt, fridgeMinutes: plan.fridgeMinutes });
    expect(steps).toEqual(plan.steps);
  });

  it('is identical after a reload with a later clock, and keeps a shortened fridge time', () => {
    // Friday 20 Nov 8:30 pm for a Saturday 7:30 pm bake: the fridge rest is shortened.
    const tight = buildPlan(request, new Date(2026, 10, 20, 20, 30).getTime());
    expect(tight.fridgeMinutes).toBeLessThan(1080);
    const s = { ...initialState(), request, bakeAt: tight.bakeAt, fridgeMinutes: tight.fridgeMinutes, plan: tight };
    save(s, env());
    flush();
    const loaded = load(env())!;
    const later = new Date(2026, 10, 22, 9, 0).getTime(); // the request's day is now past
    const rebuilt = planFromSaved(
      { request: loaded.request!, bakeAt: loaded.bakeAt!, fridgeMinutes: loaded.fridgeMinutes! },
      later,
    );
    expect(rebuilt.steps).toEqual(tight.steps);
    expect(rebuilt.fridgeMinutes).toBe(tight.fridgeMinutes);
    expect(rebuilt.bakeAt).toBe(tight.bakeAt);
    expect(rebuilt.request).toEqual(request);
  });
});
