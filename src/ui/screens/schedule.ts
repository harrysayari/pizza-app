// Schedule screen: plan summary, ingredient lists with tick-off, and the back-timed timeline.

import { formatGrams, scaleIngredients } from '../../domain/amounts';
import type { IngredientGroup } from '../../domain/recipe';
import { formatClock, formatDuration, formatWeekday, type Plan, type Step } from '../../domain/schedule';
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

function renderTimeline(plan: Plan, doneAt: Record<string, number>, now: number): HTMLElement {
  const list = el('ol', 'timeline');
  list.setAttribute('aria-label', `Schedule for a ${formatWeekday(plan.bakeAt)} ${formatClock(plan.bakeAt)} bake`);
  let nowFound = false;
  for (const step of plan.steps) {
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
  return list;
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
  left.append(
    renderSummary(plan),
    el('p', undefined, `Ready to bake ${formatWeekday(plan.bakeAt)} ${formatClock(plan.bakeAt)}`),
  );
  const change = el('button', 'btn btn-secondary btn-block', 'Change choices');
  change.type = 'button';
  change.addEventListener('click', () => changeChoices());
  left.append(change, el('h2', undefined, 'Ingredients'), ...renderIngredients(plan, state.ticked));

  const right = el('div', 'stack');
  right.style.gap = 'var(--space-5)';
  append(right, renderTooSoon());
  right.append(el('h2', undefined, 'Your steps'), renderTimeline(plan, state.doneAt, systemClock.now()));
  append(right, renderStartSteps());
  append(right, renderCalendar());

  main.append(left, right);
  return main;
}
