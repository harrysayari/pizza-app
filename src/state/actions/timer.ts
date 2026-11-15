// US2 actions: moving between steps, timers, alerts, mute and keep-screen-on.
// Time always comes from the injected clock; the display loop only redraws from timestamps.

import {
  addMinute,
  finishEarly,
  pauseTimer,
  resumeTimer,
  startTimer,
  tickTimer,
  type Timer,
} from '../../domain/timer';
import type { Plan, Step } from '../../domain/schedule';
import { createAudio } from '../../platform/audio';
import { systemClock, type Clock } from '../../platform/clock';
import { vibrate } from '../../platform/vibration';
import * as wakeLock from '../../platform/wake-lock';
import { store as appStore, type Store } from '../store';

const REFRESH_MS = 250;
const ALERT_VIBRATION = [200, 100, 200];

export type WakeStatus = 'unknown' | 'held' | 'refused' | 'unsupported';

const audio = createAudio();
let wakeStatus: WakeStatus = 'unknown';
let installed = false;
let frameListener: (() => void) | null = null;

export function getWakeStatus(): WakeStatus {
  return wakeStatus;
}

function plan(store: Store): Plan | null {
  return store.getState().plan as Plan | null;
}

function toTimer(store: Store): Timer | null {
  return store.getState().timer;
}

// ---- Wake lock ----

async function holdScreen(store: Store): Promise<void> {
  if (!store.getState().preferences.keepScreenOn) return;
  if (!wakeLock.wakeLockSupported()) {
    wakeStatus = 'unsupported';
    store.update({});
    return;
  }
  const ok = await wakeLock.request();
  wakeStatus = ok ? 'held' : 'refused';
  store.update({});
}

function releaseScreen(): void {
  if (wakeStatus === 'held') wakeStatus = 'unknown';
  void wakeLock.release();
}

// ---- Alerts and the display loop ----

/** Run one tick: fire the alert once when a running timer has ended. */
export function tick(store: Store = appStore, clock: Clock = systemClock): void {
  const t = toTimer(store);
  if (t === null || t.state !== 'running') return;
  const r = tickTimer(t, clock.now());
  if (!r.fire) return;
  store.update({ timer: r.timer });
  audio.chime();
  vibrate(ALERT_VIBRATION);
  releaseScreen();
}

/** The steps screen registers a cheap in-place redraw here, called every 250 ms while visible. */
export function setFrameListener(fn: (() => void) | null): void {
  frameListener = fn;
}

/** Wire the page-level effects once: audio unlock on the first tap, the refresh loop, visibility. */
export function installTimerEffects(store: Store = appStore, clock: Clock = systemClock): void {
  if (installed) return;
  installed = true;
  audio.setMuted(store.getState().preferences.muted);
  try {
    const unlock = (): void => audio.unlock();
    document.addEventListener('pointerdown', unlock, { capture: true });
    document.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      tick(store, clock);
      frameListener?.();
    });
    setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      tick(store, clock);
      frameListener?.();
    }, REFRESH_MS);
  } catch {
    // Without the loop the timer still fires when the page next acts.
  }
}

// ---- Moving between steps ----

function firstUndone(p: Plan, doneAt: Record<string, number>): Step {
  return p.steps.find((s) => doneAt[s.id] === undefined) ?? p.steps[0]!;
}

export function startSteps(store: Store = appStore): void {
  const p = plan(store);
  if (p === null) return;
  const s = store.getState();
  installTimerEffects(store);
  store.update({ progress: { screen: 'steps', currentStepId: firstUndone(p, s.doneAt).id } });
}

export function backToSchedule(store: Store = appStore): void {
  store.update({ progress: { ...store.getState().progress, screen: 'schedule' } });
}

export function currentStepIndex(p: Plan, currentStepId: string | null): number {
  const i = p.steps.findIndex((s) => s.id === currentStepId);
  return i >= 0 ? i : 0;
}

/** Record the step as done now and move to the next one. */
export function doneStep(store: Store = appStore, clock: Clock = systemClock): void {
  const p = plan(store);
  if (p === null) return;
  const s = store.getState();
  const i = currentStepIndex(p, s.progress.currentStepId);
  const step = p.steps[i]!;
  const next = p.steps[i + 1] ?? step;
  const doneAt = { ...s.doneAt, [step.id]: clock.now() };
  const ownTimer = s.timer !== null && s.timer.stepId === step.id;
  if (ownTimer) releaseScreen();
  store.update({
    doneAt,
    timer: ownTimer ? null : s.timer,
    progress: { ...s.progress, currentStepId: next.id },
  });
}

/** Go back one step; that step is no longer done. After the last step, reopens the last one. */
export function backStep(store: Store = appStore): void {
  const p = plan(store);
  if (p === null) return;
  const s = store.getState();
  const i = currentStepIndex(p, s.progress.currentStepId);
  const here = p.steps[i]!;
  const doneAt = { ...s.doneAt };
  if (doneAt[here.id] !== undefined) {
    // All steps were done: reopen the last one.
    delete doneAt[here.id];
    store.update({ doneAt });
    return;
  }
  if (i === 0) return;
  const prev = p.steps[i - 1]!;
  delete doneAt[prev.id];
  store.update({ doneAt, progress: { ...s.progress, currentStepId: prev.id } });
}

// ---- Timer controls ----

export function startStepTimer(step: Step, store: Store = appStore, clock: Clock = systemClock): void {
  audio.unlock();
  store.update({ timer: startTimer(step, clock.now()) });
  void holdScreen(store);
}

export function pauseStepTimer(store: Store = appStore, clock: Clock = systemClock): void {
  const t = toTimer(store);
  if (t === null) return;
  store.update({ timer: pauseTimer(t, clock.now()) });
  releaseScreen();
}

export function resumeStepTimer(store: Store = appStore, clock: Clock = systemClock): void {
  const t = toTimer(store);
  if (t === null) return;
  store.update({ timer: resumeTimer(t, clock.now()) });
  void holdScreen(store);
}

export function addMinuteToTimer(store: Store = appStore): void {
  const t = toTimer(store);
  if (t === null) return;
  store.update({ timer: addMinute(t) });
}

export function finishTimerEarly(store: Store = appStore, clock: Clock = systemClock): void {
  const t = toTimer(store);
  if (t === null) return;
  store.update({ timer: finishEarly(t, clock.now()) });
  releaseScreen();
}

// ---- Preferences ----

export function setMuted(muted: boolean, store: Store = appStore): void {
  audio.setMuted(muted);
  store.update({ preferences: { ...store.getState().preferences, muted } });
}

export function setKeepScreenOn(on: boolean, store: Store = appStore): void {
  store.update({ preferences: { ...store.getState().preferences, keepScreenOn: on } });
  const t = toTimer(store);
  if (!on) {
    releaseScreen();
  } else if (t !== null && t.state === 'running') {
    void holdScreen(store);
  }
}
