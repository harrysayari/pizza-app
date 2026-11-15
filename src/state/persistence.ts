// Saved state under the key `pdp:v1` (contracts/saved-state.schema.json). Every storage access is
// wrapped: with no storage, a blocked one or a full one, the app keeps working and just forgets.
// The step list is never stored; see src/domain/saved.ts.

import { systemClock, type Clock } from '../platform/clock';
import {
  initialState,
  type AppState,
  type Preferences,
  type Progress,
  type RequestState,
  type Screen,
  type TimerData,
} from './store';

export const STORAGE_KEY = 'pdp:v1';
const SAVE_DELAY_MS = 300;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PersistEnv {
  /** Omit for localStorage; null for no storage at all. */
  storage?: StorageLike | null;
  clock?: Clock;
}

/** What a valid saved object gives back. Instants are milliseconds, as in the store. */
export interface Loaded {
  request: RequestState | null;
  bakeAt: number | null;
  fridgeMinutes: number | null;
  ticked: Record<string, boolean>;
  doneAt: Record<string, number>;
  timer: TimerData | null;
  preferences: Preferences;
  progress: Progress;
}

function storageOf(env: PersistEnv): StorageLike | null {
  if (env.storage !== undefined) return env.storage;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// ---- Validation (the schema's shape; anything else is ignored) ----

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function instant(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

function readRequest(v: unknown): RequestState | null {
  if (!isObject(v)) return null;
  const { size, pizzas, day, time } = v;
  if (size !== 12 && size !== 14 && size !== 16) return null;
  if (typeof pizzas !== 'number' || !Number.isInteger(pizzas) || pizzas < 1 || pizzas > 12) return null;
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (time !== 'lunch' && time !== 'early' && time !== 'dinner') return null;
  return { size, pizzas, day, time };
}

function readPreferences(v: unknown): Preferences | null {
  if (!isObject(v)) return null;
  const { muted, keepScreenOn, theme } = v;
  if (typeof muted !== 'boolean' || typeof keepScreenOn !== 'boolean') return null;
  if (theme !== 'system' && theme !== 'light' && theme !== 'dark') return null;
  return { muted, keepScreenOn, theme };
}

function readTimer(v: unknown): TimerData | null {
  if (!isObject(v) || typeof v.stepId !== 'string') return null;
  const state = v.state;
  if (state !== 'idle' && state !== 'running' && state !== 'paused' && state !== 'finished') return null;
  const endAt = v.endAt === undefined ? 0 : instant(v.endAt);
  if (endAt === null) return null;
  const remaining = v.remainingMs === undefined ? 0 : v.remainingMs;
  if (typeof remaining !== 'number' || !Number.isInteger(remaining) || remaining < 0) return null;
  if (state === 'running' && endAt === 0) return null;
  return { stepId: v.stepId, state, endAt, remainingMs: remaining, alerted: v.alerted === true };
}

function readProgress(v: unknown): Progress {
  const out: Progress = { screen: 'plan', currentStepId: null };
  if (!isObject(v)) return out;
  if (v.screen === 'plan' || v.screen === 'schedule' || v.screen === 'steps') out.screen = v.screen as Screen;
  if (typeof v.currentStepId === 'string') out.currentStepId = v.currentStepId;
  return out;
}

function parse(raw: string | null): Loaded | null {
  if (raw === null) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(obj) || obj.version !== 1) return null;
  const preferences = readPreferences(obj.preferences);
  if (preferences === null) return null;

  const request = readRequest(obj.request);
  const bakeAt = request ? instant(obj.bakeAt) : null;
  const f = obj.fridgeMinutes;
  const fridgeOk = typeof f === 'number' && Number.isInteger(f) && f >= 960 && f <= 1440;
  const planOk = request !== null && bakeAt !== null && fridgeOk;

  const ticked: Record<string, boolean> = {};
  if (Array.isArray(obj.ticked)) for (const id of obj.ticked) if (typeof id === 'string') ticked[id] = true;

  const doneAt: Record<string, number> = {};
  if (isObject(obj.doneAt)) {
    for (const [id, v] of Object.entries(obj.doneAt)) {
      const t = instant(v);
      if (t !== null) doneAt[id] = t;
    }
  }

  return {
    request,
    bakeAt: planOk ? bakeAt : null,
    fridgeMinutes: planOk ? (f as number) : null,
    ticked,
    doneAt,
    timer: readTimer(obj.timer),
    preferences,
    progress: readProgress(obj.progress),
  };
}

/** The saved state, or null when nothing usable is saved. */
export function load(env: PersistEnv = {}): Loaded | null {
  try {
    const storage = storageOf(env);
    return storage === null ? null : parse(storage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

// ---- Writing ----

const iso = (t: number): string => new Date(t).toISOString();

function isEmpty(s: AppState): boolean {
  const d = initialState().preferences;
  const p = s.preferences;
  return (
    s.request === null &&
    s.bakeAt === null &&
    Object.keys(s.ticked).length === 0 &&
    Object.keys(s.doneAt).length === 0 &&
    s.timer === null &&
    p.muted === d.muted &&
    p.keepScreenOn === d.keepScreenOn &&
    p.theme === d.theme
  );
}

function serialise(s: AppState, now: number): string {
  const out: Record<string, unknown> = { version: 1, savedAt: iso(now) };
  if (s.request !== null) out.request = s.request;
  if (s.request !== null && s.bakeAt !== null && s.fridgeMinutes !== null) {
    out.bakeAt = iso(s.bakeAt);
    out.fridgeMinutes = s.fridgeMinutes;
  }
  out.ticked = Object.keys(s.ticked).filter((id) => s.ticked[id]);
  out.doneAt = Object.fromEntries(Object.entries(s.doneAt).map(([id, t]) => [id, iso(t)]));
  if (s.timer !== null) {
    const t = s.timer;
    out.timer = {
      stepId: t.stepId,
      state: t.state,
      ...(t.endAt > 0 ? { endAt: iso(t.endAt) } : {}),
      remainingMs: Math.max(0, Math.round(t.remainingMs)),
      alerted: t.alerted,
    };
  }
  out.preferences = s.preferences;
  out.progress = s.progress;
  return JSON.stringify(out);
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: (() => void) | null = null;

function cancel(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  pending = null;
}

function write(state: AppState, env: PersistEnv): void {
  try {
    const storage = storageOf(env);
    if (storage === null) return;
    if (isEmpty(state)) storage.removeItem(STORAGE_KEY);
    else storage.setItem(STORAGE_KEY, serialise(state, (env.clock ?? systemClock).now()));
  } catch {
    // Storage is full or blocked: the app carries on without remembering.
  }
}

/** Save soon: calls within the delay collapse into one write of the latest state. */
export function save(state: AppState, env: PersistEnv = {}): void {
  pending = () => write(state, env);
  if (timer !== null) clearTimeout(timer);
  try {
    timer = setTimeout(flush, SAVE_DELAY_MS);
  } catch {
    flush();
  }
}

/** Write any save that is still waiting. Call when the page is hidden or closing. */
export function flush(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  const run = pending;
  pending = null;
  run?.();
}

/** Forget the plan, ticks, steps and timers; keep the preferences. */
export function clearPlan(env: PersistEnv = {}): void {
  cancel();
  try {
    const storage = storageOf(env);
    if (storage === null) return;
    const loaded = parse(storage.getItem(STORAGE_KEY));
    if (loaded === null) return;
    write({ ...initialState(), preferences: loaded.preferences }, env);
  } catch {
    // Nothing more can be done.
  }
}

/** Forget everything, preferences included. */
export function clearAll(env: PersistEnv = {}): void {
  cancel();
  try {
    storageOf(env)?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing more can be done.
  }
}
