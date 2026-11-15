// The in-page alert: which one shows, the repeating chime and vibration, and the three taps on it.
// The alert is worked out from state each time (src/domain/alert.ts), so it survives a reload and
// there is one rule for "the page was open", "in the background" and "closed" (spec FR-001..005, 016).

import { CHIME_COUNT, CHIME_EVERY_MS, SNOOZE_MS, activeAlert, chimesDue, type TimerAlert } from '../../domain/alert';
import type { Plan } from '../../domain/schedule';
import { extendFinished } from '../../domain/timer';
import { systemClock, type Clock } from '../../platform/clock';
import { vibrate } from '../../platform/vibration';
import { store as appStore, type Store } from '../store';
import { chime, doneStepById } from './timer';

const ALERT_VIBRATION = [200, 100, 200];

let shownKey: string | null = null;
let played = 0;

const keyOf = (a: TimerAlert): string => `${a.kind}:${a.stepId}:${a.endedAt}`;

/** The alert to show now, or null. */
export function getActiveAlert(store: Store = appStore, clock: Clock = systemClock): TimerAlert | null {
  const s = store.getState();
  const plan = s.plan as Plan | null;
  if (plan === null) return null;
  return activeAlert({
    steps: plan.steps,
    timer: s.timer,
    doneAt: s.doneAt,
    snoozes: s.snoozes,
    currentStepId: s.progress.currentStepId,
    now: clock.now(),
  });
}

/**
 * Keep the sound in step with the alert. Call on every tick and on every state change. The chime and
 * vibration repeat every 30 seconds for 5 minutes. Coming back to a missed alert chimes once, not once
 * for each chime that was missed. Redraws when the alert appears or goes.
 */
export function runAlerts(store: Store = appStore, clock: Clock = systemClock): void {
  const now = clock.now();
  const alert = getActiveAlert(store, clock);
  const key = alert === null ? null : keyOf(alert);

  if (key !== shownKey) {
    const hadAlert = shownKey !== null;
    shownKey = key;
    played = 0;
    if (alert === null && hadAlert) vibrate(0); // acting on the alert stops everything at once
    store.update({});
  }
  if (alert === null) return;

  const due = chimesDue(alert.endedAt, now);
  const inWindow = now - alert.endedAt < CHIME_COUNT * CHIME_EVERY_MS;
  if (due > played) {
    played = due;
    if (inWindow) {
      chime();
      vibrate(ALERT_VIBRATION);
    }
  }
}

/** "Done, next step" on the alert. */
export function alertDone(store: Store = appStore, clock: Clock = systemClock): void {
  const alert = getActiveAlert(store, clock);
  if (alert === null) return;
  doneStepById(alert.stepId, store, clock);
  runAlerts(store, clock);
}

/** "+1 min": the finished timer runs for one more minute. */
export function alertPlusMinute(store: Store = appStore, clock: Clock = systemClock): void {
  const s = store.getState();
  if (s.timer === null) return;
  store.update({ timer: extendFinished(s.timer, clock.now()) });
  runAlerts(store, clock);
}

/** "Remind me in 15 min" on a long wait. */
export function alertRemindLater(store: Store = appStore, clock: Clock = systemClock): void {
  const alert = getActiveAlert(store, clock);
  if (alert === null || alert.kind !== 'wait') return;
  const s = store.getState();
  store.update({ snoozes: { ...s.snoozes, [alert.stepId]: clock.now() + SNOOZE_MS } });
  runAlerts(store, clock);
}

let installed = false;

/** Wire the alert once: it follows every state change, and is re-checked every 250 ms and on return. */
export function installAlertEffects(store: Store = appStore, clock: Clock = systemClock): void {
  if (installed) return;
  installed = true;
  try {
    store.subscribe(() => runAlerts(store, clock));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') runAlerts(store, clock);
    });
    setInterval(() => {
      if (document.visibilityState !== 'hidden') runAlerts(store, clock);
    }, 250);
  } catch {
    // Without the loop the alert still shows on the next state change.
  }
}
