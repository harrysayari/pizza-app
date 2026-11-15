// Start-up and reset for saved state (US6): load what the device remembers, apply a shared link,
// keep saving on every change, and the two resets (Start a new plan, Clear saved data).
// Every browser call is wrapped; with nothing saved the app simply starts empty.

import { planFromSaved, restoreTimer } from '../domain/saved';
import { localDateOf, systemClock, type Clock } from '../platform/clock';
import { openStepFromNotification } from './actions/notify';
import { setRequest } from './actions/plan';
import { setMuted } from './actions/timer';
import { clearAll, clearPlan, flush, load, save, type PersistEnv } from './persistence';
import { readLink, type LinkChoices } from './share-link';
import { initialState, store as appStore, type Store } from './store';

export interface HydrateEnv extends PersistEnv {
  clock?: Clock;
  /** The page address. Defaults to location.href. */
  url?: string;
}

const DEFAULT_DRAFT = { size: 14 as const, pizzas: 4, day: null, time: null };

/** A shared link that arrived while a plan was already saved: the user is asked which to keep. */
let sharedChoice: LinkChoices | null = null;

export function getPendingShare(): LinkChoices | null {
  return sharedChoice;
}

function clockOf(env: HydrateEnv): Clock {
  return env.clock ?? systemClock;
}

function stripLink(): void {
  try {
    if (location.search !== '') history.replaceState(null, '', location.pathname);
  } catch {
    // The address stays as it is.
  }
}

/** Put the plan screen's draft choices back to the defaults. */
function resetDraft(store: Store, env: HydrateEnv): void {
  setRequest({ ...DEFAULT_DRAFT }, store, clockOf(env));
}

function clearPlanState(store: Store): void {
  store.update({
    request: null,
    bakeAt: null,
    fridgeMinutes: null,
    plan: null,
    ticked: {},
    doneAt: {},
    snoozes: {},
    timer: null,
    progress: { screen: 'plan', currentStepId: null },
  });
}

/** Start a new plan: clears the request, plan, ticks, steps and timers, and keeps preferences. */
export function startNewPlan(store: Store = appStore, env: HydrateEnv = {}): void {
  sharedChoice = null;
  clearPlan(env);
  clearPlanState(store);
  resetDraft(store, env);
}

/** Clear saved data: removes everything remembered on the device, preferences included. */
export function clearSavedData(store: Store = appStore, env: HydrateEnv = {}): void {
  sharedChoice = null;
  clearAll(env);
  store.update({ ...initialState() });
  setMuted(false, store);
  resetDraft(store, env);
}

function applyLink(link: LinkChoices, store: Store, env: HydrateEnv, replacePlan: boolean): void {
  if (replacePlan) {
    clearPlanState(store);
    resetDraft(store, env);
  }
  setRequest({ ...link }, store, clockOf(env));
}

/** The user's answer to "Open the shared plan or keep your current one?". */
export function resolveShare(open: boolean, store: Store = appStore, env: HydrateEnv = {}): void {
  const link = sharedChoice;
  sharedChoice = null;
  stripLink();
  if (link !== null && open) applyLink(link, store, env, true);
  else store.update({});
}

function restore(store: Store, env: HydrateEnv, now: number): boolean {
  const saved = load(env);
  if (saved === null) return false;

  const patch: Partial<ReturnType<Store['getState']>> = { preferences: saved.preferences };
  if (saved.request !== null) {
    patch.request = saved.request;
    patch.ticked = saved.ticked;
  }
  if (saved.request !== null && saved.bakeAt !== null && saved.fridgeMinutes !== null) {
    const inputs = { request: saved.request, bakeAt: saved.bakeAt, fridgeMinutes: saved.fridgeMinutes };
    const ids = planFromSaved(inputs, now).steps.map((s) => s.id);
    const doneAt = Object.fromEntries(Object.entries(saved.doneAt).filter(([id]) => ids.includes(id)));
    const plan = planFromSaved(inputs, now, Object.keys(doneAt).length > 0);
    const current =
      saved.progress.currentStepId !== null && ids.includes(saved.progress.currentStepId)
        ? saved.progress.currentStepId
        : null;
    patch.plan = plan;
    patch.bakeAt = saved.bakeAt;
    patch.fridgeMinutes = saved.fridgeMinutes;
    patch.doneAt = doneAt;
    patch.snoozes = Object.fromEntries(Object.entries(saved.snoozes).filter(([id]) => ids.includes(id)));
    patch.timer = restoreTimer(saved.timer, ids, now);
    patch.progress = { screen: saved.progress.screen, currentStepId: current };
  }
  store.update(patch);
  if (saved.preferences.muted) setMuted(true, store);
  return saved.request !== null;
}

/** Restore saved state and any shared link, then keep saving. Call once, before the first render. */
export function hydrate(store: Store = appStore, env: HydrateEnv = {}): void {
  const now = clockOf(env).now();
  let hadPlan = false;
  try {
    hadPlan = restore(store, env, now);
  } catch {
    // Unreadable saved data counts as no saved data.
  }

  try {
    // A tap on a timer notification opens the app at ./?step=<id>.
    const step = new URL(env.url ?? location.href).searchParams.get('step');
    if (step !== null) {
      openStepFromNotification(step, store);
      stripLink();
    }
  } catch {
    // No address, no step.
  }

  try {
    const link = readLink(env.url ?? location.href, localDateOf(now));
    if (Object.keys(link).length > 0) {
      if (hadPlan) {
        sharedChoice = link; // keep the address until the user answers
      } else {
        applyLink(link, store, env, false);
        stripLink();
      }
    }
  } catch {
    // No address, no link.
  }

  try {
    store.subscribe((s) => save(s, env));
    const writeNow = (): void => flush();
    window.addEventListener('pagehide', writeNow);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') writeNow();
    });
  } catch {
    // Saving is a convenience.
  }
}
