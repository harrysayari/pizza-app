// Schedule screen: plan summary, ingredient lists with tick-off, and the back-timed timeline.

import { formatGrams, isLargeBatch, scaleIngredients } from '../../domain/amounts';
import type { IngredientGroup } from '../../domain/recipe';
import { formatClock, formatDuration, formatWeekday, planParts, type PartId, type Plan, type Step } from '../../domain/schedule';
import { systemClock } from '../../platform/clock';
import { changeChoices, getPlan, preserveFocus, toggleTick } from '../../state/actions/plan';
import type { AppState } from '../../state/store';
import { renderIngredientRow } from '../components/ingredient-row';
import { renderTimelineItem, type TimelineState } from '../components/timeline-item';
import { renderCalendar, renderStartSteps } from '../slots/schedule-actions';
import { renderTooSoon } from '../slots/too-soon';

type Slot = string | Node;

function append(parent: HTMLElement, slot: Slot): void {
  if (typeof slot === 'string') {
    if (slot !== '') parent.insertAdjacentHTML('beforeend', slot);
  } else {
    parent.append(slot);
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function summaryItem(label: string, value: string): HTMLElement {
  const item = el('div', 'summary-item');
  item.append(el('span', 'summary-label', label), el('span', 'amount', value));
  return item;
}

function renderSummary(plan: Plan): HTMLElement {
  const box = el('div', 'summary');
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', 'Plan summary');
  box.append(
    summaryItem('Pizzas', `${plan.request.pizzas} × ${plan.request.size}"`),
    summaryItem('Each ball', `${plan.ballGrams} g`),
    summaryItem('Total dough', `${plan.totalGrams.toLocaleString('en-US')} g`),
  );
  return box;
}

function renderIngredients(plan: Plan, ticked: Record<string, boolean>): HTMLElement[] {
  const groups: IngredientGroup[] = ['Poolish', 'Final dough'];
  const all = scaleIngredients(plan.totalGrams);
  return groups.map((group) => {
    const stack = el('div', 'stack');
    stack.append(el('h3', 'h3', group));
    const list = el('ul', 'ing-list');
    for (const ing of all.filter((i) => i.group === group)) {
      list.append(
        renderIngredientRow({
          id: ing.id,
          name: ing.name,
          amount: formatGrams(ing.grams),
          checked: ticked[ing.id] === true,
          onChange: () => toggleTick(ing.id),
        }),
      );
    }
    stack.append(list);
    return stack;
  });
}

function amountsText(step: Step): string {
  return step.amounts.map((a) => `${formatGrams(a.grams)} ${a.name.toLowerCase()}`).join(', ');
}

// Which parts the cook has opened or closed. The whole screen is rebuilt on every state change,
// so this lives here and is applied each time. Until a part is touched it follows the first undone step.
const partOpen: Partial<Record<PartId, boolean>> = {};

function windowText(startAt: number, endAt: number): string {
  const sameDay = formatWeekday(startAt) === formatWeekday(endAt);
  return `${formatWeekday(startAt)} ${formatClock(startAt)} to ${sameDay ? '' : `${formatWeekday(endAt)} `}${formatClock(endAt)}`;
}

function renderTimeline(plan: Plan, doneAt: Record<string, number>, now: number): HTMLElement {
  const wrap = el('div', 'tl-groups');
  wrap.setAttribute('aria-label', `Schedule for a ${formatWeekday(plan.bakeAt)} ${formatClock(plan.bakeAt)} bake`);
  const firstUndone = plan.steps.find((s) => doneAt[s.id] === undefined)?.id;
  let nowFound = false;
  for (const part of planParts(plan)) {
    const list = el('ol', 'timeline');
    for (const step of part.steps) {
      let state: TimelineState = 'later';
      if (doneAt[step.id] !== undefined) state = 'done';
      else if (!nowFound && step.startAt <= now) state = 'now';
      if (state !== 'done') nowFound = nowFound || state === 'now';

      const minutes = Math.round((step.endAt - step.startAt) / 60_000);
      const details = [step.instruction];
      if (step.amounts.length > 0) details.push(amountsText(step));
      if (step.usesBallWeight) details.push(`Each ball weighs ${plan.ballGrams} g.`);
      list.append(
        renderTimelineItem({
          clock: formatClock(step.startAt),
          day: formatWeekday(step.startAt),
          title: step.title,
          details,
          badges: [step.kind === 'wait' ? `Wait ${formatDuration(minutes)}` : formatDuration(minutes)],
          state,
        }),
      );
    }

    const group = el('details', 'tl-group');
    const holdsNext = firstUndone === undefined ? false : part.steps.some((s) => s.id === firstUndone);
    group.open = partOpen[part.id] ?? holdsNext;
    group.addEventListener('toggle', () => {
      partOpen[part.id] = group.open;
    });
    const head = el('summary', 'tl-group-head');
    head.append(
      el('span', 'tl-group-title', part.title),
      el('span', 'tl-group-hours', formatDuration(part.minutes)),
      el('span', 'tl-group-note', part.note),
      el('span', 'tl-group-window', windowText(part.startAt, part.endAt)),
    );
    group.append(head, list);
    wrap.append(group);
  }
  return wrap;
}

export function renderScheduleScreen(state: AppState): HTMLElement {
  preserveFocus();
  const plan = getPlan();
  const main = el('main', 'screen screen-schedule');
  main.dataset.screen = 'schedule';
  main.append(el('h1', undefined, 'Your schedule'));

  if (plan === null) {
    const empty = el('div', 'stack');
    empty.append(el('p', undefined, 'There is no plan yet. Choose a size, a day and a time first.'));
    const back = el('button', 'btn btn-primary btn-block', 'Plan your pizza night');
    back.type = 'button';
    back.addEventListener('click', () => changeChoices());
    empty.append(back);
    main.append(empty);
    return main;
  }

  const left = el('div', 'stack');
  left.style.gap = 'var(--space-5)';
  const largeBatch = isLargeBatch(plan.totalGrams)
    ? el('p', undefined, 'This is a lot of dough. A home mixer or bowl may not hold it, so mix it in two lots.')
    : null;
  if (largeBatch) largeBatch.dataset.slot = 'large-batch';
  left.append(
    renderSummary(plan),
    ...(largeBatch ? [largeBatch] : []),
    el('p', undefined, `Ready to bake ${formatWeekday(plan.bakeAt)} ${formatClock(plan.bakeAt)}`),
  );
  const change = el('button', 'btn btn-secondary btn-block', 'Change choices');
  change.type = 'button';
  change.addEventListener('click', () => changeChoices());
  left.append(change, el('h2', undefined, 'Ingredients'), ...renderIngredients(plan, state.ticked));

  const right = el('div', 'stack');
  right.style.gap = 'var(--space-5)';
  append(right, renderTooSoon());
  const first = plan.steps[0];
  const totalMinutes = first ? Math.round((plan.bakeAt - first.startAt) / 60_000) : 0;
  right.append(
    el('h2', undefined, 'Your steps'),
    el('p', 'tl-total', `Total ${formatDuration(totalMinutes)}, ${first ? windowText(first.startAt, plan.bakeAt) : ''}`),
    renderTimeline(plan, state.doneAt, systemClock.now()),
  );
  append(right, renderStartSteps());
  append(right, renderCalendar());

  main.append(left, right);
  return main;
}
