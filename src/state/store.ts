// Core app state. Story actions live in src/state/actions/*; this file only holds the shape,
// the defaults and the get/subscribe/update mechanics.

export type Screen = 'plan' | 'schedule' | 'steps';
export type Theme = 'system' | 'light' | 'dark';
export type TimerState = 'idle' | 'running' | 'paused' | 'finished';

/** The user's choices (data-model.md, Request). */
export interface RequestState {
  size: 12 | 14 | 16;
  pizzas: number;
  day: string; // YYYY-MM-DD
  time: 'lunch' | 'early' | 'dinner';
}

export interface TimerData {
  stepId: string;
  state: TimerState;
  endAt: number;
  remainingMs: number;
  alerted: boolean;
}

export interface Preferences {
  muted: boolean;
  keepScreenOn: boolean;
  theme: Theme;
}

export interface Progress {
  screen: Screen;
  currentStepId: string | null;
}

export interface AppState {
  request: RequestState | null;
  bakeAt: number | null;
  fridgeMinutes: number | null;
  /** The derived Plan. Typed by the domain lane (src/domain/schedule.ts); opaque to the shell. */
  plan: unknown | null;
  ticked: Record<string, boolean>;
  doneAt: Record<string, number>;
  timer: TimerData | null;
  preferences: Preferences;
  progress: Progress;
}

export type Listener = (state: AppState) => void;

export interface Store {
  getState(): AppState;
  subscribe(fn: Listener): () => void;
  update(patch: Partial<AppState>): void;
}

export function initialState(): AppState {
  return {
    request: null,
    bakeAt: null,
    fridgeMinutes: null,
    plan: null,
    ticked: {},
    doneAt: {},
    timer: null,
    preferences: { muted: false, keepScreenOn: true, theme: 'system' },
    progress: { screen: 'plan', currentStepId: null },
  };
}

export function createStore(initial: AppState = initialState()): Store {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    update(patch) {
      state = { ...state, ...patch };
      for (const fn of [...listeners]) fn(state);
    },
  };
}

/** The app-wide store. Tests create their own with createStore(). */
export const store: Store = createStore();
export const getState = store.getState;
export const subscribe = store.subscribe;
export const update = store.update;
