// Step mode: one step per screen, a timer for short waits, a come-back time for the long one.

import { estimateReady } from '../../domain/estimate';
import { progressCrumbs, stepTimeText } from '../../domain/progress';
import { formatGrams } from '../../domain/amounts';
import { formatClock, formatDuration, formatWeekday, type Plan, type Step } from '../../domain/schedule';
import { localDateOf, systemClock } from '../../platform/clock';
import { wakeLockSupported } from '../../platform/wake-lock';
import { changeChoices, getPlan, preserveFocus } from '../../state/actions/plan';
import {
  addMinuteToTimer,
  backStep,
  backToSchedule,
  currentStepIndex,
  doneStep,
  finishTimerEarly,
  getWakeStatus,
  installTimerEffects,
  pauseStepTimer,
  resumeStepTimer,
  setFrameListener,
  setKeepScreenOn,
  setMuted,
  startStepTimer,
} from '../../state/actions/timer';
import type { AppState } from '../../state/store';
import { renderCrumbs, updateCrumbTime } from '../components/crumbs';
import { renderPizzaArt } from '../components/pizza-art';
import { renderStepCard } from '../components/step-card';
import { renderTimer, updateTimer, type TimerProps } from '../components/timer';
import { renderToggle } from '../components/toggle';
import { renderNotifyControl } from '../slots/notify-control';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(text: string, className: string, key: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  b.dataset.key = key;
  b.addEventListener('click', onClick);
  return b;
}

type TimerView = Pick<TimerProps, 'title' | 'state' | 'totalMs' | 'remainingMs' | 'endedAgoMin'>;

function timerView(step: Step, state: AppState, now: number): TimerView {
  const totalMs = step.endAt - step.startAt;
  const title = step.title;
  const t = state.timer !== null && state.timer.stepId === step.id ? state.timer : null;
  if (t === null || t.state === 'idle') return { title, state: 'idle', totalMs, remainingMs: totalMs, endedAgoMin: 0 };
  if (t.state === 'running') return { title, state: 'running', totalMs, remainingMs: Math.max(0, t.endAt - now), endedAgoMin: 0 };
  if (t.state === 'paused') return { title, state: 'paused', totalMs, remainingMs: t.remainingMs, endedAgoMin: 0 };
  return { title, state: 'finished', totalMs, remainingMs: 0, endedAgoMin: Math.floor(Math.max(0, now - t.endAt) / 60_000) };
}

function stamp(instant: number, now: number): string {
  const same = localDateOf(instant) === localDateOf(now);
  return `${same ? '' : `${formatWeekday(instant)} `}${formatClock(instant)}`;
}

/** Only when running late: "25 min behind. Ready about Mon 7:55 pm". Ahead or on time shows nothing. */
function lateLine(plan: Plan, state: AppState, now: number): HTMLElement | null {
  const { readyAt, minutesBehind } = estimateReady(plan, state.doneAt, now);
  return minutesBehind > 0 ? el('p', 'step-estimate', `${minutesBehind} min behind. Ready about ${stamp(readyAt, now)}`) : null;
}

/** The time shown on the current part of the breadcrumb for this step. */
function crumbTime(step: Step, state: AppState, now: number): string {
  const plannedMinutes = Math.round((step.endAt - step.startAt) / 60_000);
  if (step.kind !== 'wait' || step.long) return stepTimeText({ plannedMinutes, timer: 'idle', remainingMs: 0 });
  const v = timerView(step, state, now);
  return stepTimeText({ plannedMinutes, timer: v.state, remainingMs: v.remainingMs });
}

function controls(state: AppState): HTMLElement {
  const box = el('div', 'stack');
  box.style.gap = 'var(--space-3)';
  const wake = getWakeStatus();
  const reason = !wakeLockSupported()
    ? 'Not available in this browser'
    : wake === 'refused'
      ? 'The screen may lock while you wait'
      : undefined;
  box.append(
    renderToggle({
      label: 'Keep screen on',
      checked: state.preferences.keepScreenOn,
      disabledReason: reason,
      key: 'keep-screen',
      onChange: (on) => setKeepScreenOn(on),
    }),
  );
  const muted = state.preferences.muted;
  box.append(
    button(muted ? 'Unmute sound' : 'Mute sound', 'btn btn-secondary', 'mute', () => setMuted(!muted)),
    button('Back to schedule', 'btn btn-secondary', 'to-schedule', () => backToSchedule()),
    renderNotifyControl(state, 'h3'),
  );
  return box;
}

export function renderStepsScreen(state: AppState): HTMLElement {
  installTimerEffects();
  preserveFocus();
  const plan = getPlan();
  const main = el('main', 'screen screen-steps');
  main.dataset.screen = 'steps';
  main.append(el('h1', undefined, 'Step by step'));

  if (plan === null) {
    const empty = el('div', 'stack');
    empty.append(el('p', undefined, 'There is no plan yet. Choose a size, a day and a time first.'));
    empty.append(button('Plan your pizza night', 'btn btn-primary btn-block', 'to-plan', () => changeChoices()));
    main.append(empty);
    return main;
  }

  const now = systemClock.now();
  const total = plan.steps.length;
  const index = currentStepIndex(plan, state.progress.currentStepId);
  const step = plan.steps[index]!;
  const allDone = plan.steps.every((s) => state.doneAt[s.id] !== undefined);

  main.append(renderCrumbs(progressCrumbs(plan, allDone ? total : index), allDone ? '' : crumbTime(step, state, now)));
  const late = lateLine(plan, state, now);
  if (late) main.append(late);

  if (allDone) {
    const finished = el('div', 'stack');
    finished.append(
      el('h2', undefined, 'Your dough is ready'),
      renderPizzaArt(),
      el('p', 'step-text', `All ${total} steps are done. Bake at ${stamp(plan.bakeAt, now)}.`),
      button('Back', 'btn btn-secondary btn-block', 'step:back', () => backStep()),
    );
    main.append(finished, controls(state));
  } else {
    let extra: Node | null = null;
    const canTime = step.kind === 'wait' && !step.long;
    if (canTime) {
      const view = timerView(step, state, now);
      const timer = renderTimer({
        ...view,
        onStart: () => startStepTimer(step),
        onPause: () => pauseStepTimer(),
        onResume: () => resumeStepTimer(),
        onAddMinute: () => addMinuteToTimer(),
        onFinishEarly: () => finishTimerEarly(),
      });
      extra = timer;
      setFrameListener(() => {
        const live = document.querySelector<HTMLElement>('.timer');
        if (live && view.state === 'running') {
          const t = systemClock.now();
          updateTimer(live, timerView(step, state, t));
          updateCrumbTime(document, crumbTime(step, state, t));
        }
      });
    } else if (step.kind === 'wait') {
      const minutes = Math.round((step.endAt - step.startAt) / 60_000);
      const back = el('div', 'stack');
      back.append(
        el('p', 'step-text', `Come back at ${formatWeekday(step.endAt)} ${formatClock(step.endAt)}`),
        el('p', undefined, `Wait ${formatDuration(minutes)}. Nothing to do until then.`),
      );
      extra = back;
    }
    if (!canTime) setFrameListener(null);

    const text = step.usesBallWeight ? `${step.instruction} Each ball weighs ${plan.ballGrams} g.` : step.instruction;
    main.append(
      renderStepCard({
        index: index + 1,
        total,
        title: step.title,
        text,
        amounts: step.amounts.map((a) => ({ amount: formatGrams(a.grams), name: a.name.toLowerCase() })),
        extra,
        canGoBack: index > 0,
        onBack: () => backStep(),
        onDone: () => doneStep(),
      }),
      controls(state),
    );
  }

  return main;
}
