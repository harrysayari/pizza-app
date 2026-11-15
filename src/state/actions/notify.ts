// Timer notifications (spec 002, US2): the on/off choice, and the notification shown through the
// browser when a timer ends while the page is in the background. The permission prompt is only ever
// requested from turnOn(), which the control calls from a tap (FR-007).

import type { Plan } from '../../domain/schedule';
import { systemClock, type Clock } from '../../platform/clock';
import * as notifications from '../../platform/notifications';
import { store as appStore, type Preferences, type Store } from '../store';
import { getActiveAlert } from './alert';

export type ControlState =
  | { state: 'off' }
  | { state: 'on' }
  | { state: 'blocked' }
  | { state: 'unavailable'; reason: 'home-screen' | 'unsupported' };

const REPEAT_MS = 5 * 60_000;
export const NOTIFY_TITLE = 'Time is up';

/** What the control shows: worked out from the saved choice and the browser's live permission. */
export function controlState(prefs: Preferences): ControlState {
  const support = notifications.support();
  if (support === 'needs-home-screen') return { state: 'unavailable', reason: 'home-screen' };
  if (support === 'none') return { state: 'unavailable', reason: 'unsupported' };
  const permission = notifications.permission();
  if (permission === 'denied') return { state: 'blocked' };
  if (prefs.notify === 'on' && permission === 'granted') return { state: 'on' };
  return { state: 'off' };
}

function setNotify(store: Store, on: boolean): void {
  const { notify: _drop, ...rest } = store.getState().preferences;
  store.update({ preferences: on ? { ...rest, notify: 'on' } : rest });
}

/** Ask the browser for permission, then turn notifications on if it was given. Call from a tap. */
export async function turnOn(store: Store = appStore): Promise<void> {
  const result = await notifications.request();
  if (result === 'granted') setNotify(store, true);
  else store.update({});
}

export function turnOff(store: Store = appStore): void {
  setNotify(store, false);
  void notifications.close();
}

/** Open step mode on the step a notification was about. Does nothing without a plan or for an unknown id. */
export function openStepFromNotification(stepId: string | null | undefined, store: Store = appStore): void {
  const plan = store.getState().plan as Plan | null;
  if (plan === null || !stepId || !plan.steps.some((s) => s.id === stepId)) return;
  store.update({ progress: { screen: 'steps', currentStepId: stepId } });
}

// ---- The notification when a timer ends in the background ----

interface Scheduled {
  key: string;
  end: ReturnType<typeof setTimeout>;
  repeat: ReturnType<typeof setTimeout> | null;
  tag: string;
}

let scheduled: Scheduled | null = null;
let installed = false;

function cancel(): void {
  if (scheduled === null) return;
  clearTimeout(scheduled.end);
  if (scheduled.repeat !== null) clearTimeout(scheduled.repeat);
  void notifications.close(scheduled.tag);
  scheduled = null;
}

const hidden = (): boolean => document.visibilityState === 'hidden';

function wanted(store: Store, now: number): { key: string; stepId: string; title: string; endAt: number } | null {
  const s = store.getState();
  const plan = s.plan as Plan | null;
  if (plan === null || s.timer === null || s.timer.state !== 'running') return null;
  if (controlState(s.preferences).state !== 'on') return null;
  const step = plan.steps.find((x) => x.id === s.timer!.stepId);
  if (step === undefined || s.doneAt[step.id] !== undefined || s.timer.endAt <= now - REPEAT_MS) return null;
  return { key: `${step.id}:${s.timer.endAt}`, stepId: step.id, title: step.title, endAt: s.timer.endAt };
}

function show(store: Store, w: { stepId: string; title: string }, repeat: boolean): void {
  void notifications.show(NOTIFY_TITLE, {
    body: w.title,
    tag: `pdp-${w.stepId}`,
    silent: store.getState().preferences.muted,
    renotify: repeat,
    data: { stepId: w.stepId },
  });
}

/** Keep the one pending notification in step with the timer: set, moved or cancelled by any change. */
export function syncNotifications(store: Store = appStore, clock: Clock = systemClock): void {
  const now = clock.now();
  const w = wanted(store, now);
  if (w === null) return cancel();
  if (scheduled !== null && scheduled.key === w.key) return;
  cancel();
  const tag = `pdp-${w.stepId}`;
  const end = setTimeout(() => {
    // Visible: the alert on the page is enough, no notification (FR-011).
    if (!hidden()) return;
    show(store, w, false);
    if (scheduled === null) return;
    // One more, 5 minutes later, only if the app has not been opened and the alert is still there (FR-009).
    scheduled.repeat = setTimeout(() => {
      const alert = getActiveAlert(store, clock);
      if (hidden() && alert !== null && alert.stepId === w.stepId) show(store, w, true);
    }, REPEAT_MS);
  }, Math.max(0, w.endAt - now));
  scheduled = { key: w.key, end, repeat: null, tag };
}

/** Wire the notification effects once. */
export function installNotifyEffects(store: Store = appStore, clock: Clock = systemClock): void {
  if (installed) return;
  installed = true;
  try {
    store.subscribe(() => syncNotifications(store, clock));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      // Opening the app takes the notification away and cancels the repeat.
      if (scheduled?.repeat) clearTimeout(scheduled.repeat);
      if (scheduled) scheduled.repeat = null;
      void notifications.close();
    });
    navigator.serviceWorker?.addEventListener('message', (e: MessageEvent) => {
      const data = e.data as { type?: string; stepId?: string } | null;
      if (data?.type === 'pdp-open') openStepFromNotification(data.stepId, store);
    });
    syncNotifications(store, clock);
  } catch {
    // Without these the in-page alert still works.
  }
}
