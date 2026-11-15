// Plan screen: size, pizzas, day and time chips, then "Make my plan".

import { SIZES, TIME_CHOICES, type PizzaSize, type TimeChoiceId } from '../../domain/recipe';
import { systemClock } from '../../platform/clock';
import {
  currentChoices,
  makePlan,
  offeredDays,
  preserveFocus,
  setRequest,
  timeChoiceSub,
} from '../../state/actions/plan';
import type { AppState } from '../../state/store';
import { renderChipGroup } from '../components/chip';
import { renderStepper } from '../components/stepper';
import { renderMenu } from '../slots/menu';
import { renderSentence } from '../slots/sentence';
import { renderTooSoon } from '../slots/too-soon';

type Slot = string | Node;

function append(parent: HTMLElement, slot: Slot): void {
  if (typeof slot === 'string') {
    if (slot !== '') parent.insertAdjacentHTML('beforeend', slot);
  } else {
    parent.append(slot);
  }
}

export function renderPlanScreen(_state: AppState): HTMLElement {
  preserveFocus();
  const now = systemClock.now();
  const choices = currentChoices(undefined, now);

  const main = document.createElement('main');
  main.className = 'screen screen-plan';
  main.dataset.screen = 'plan';

  const h1 = document.createElement('h1');
  h1.textContent = 'Pizza Dough Planner';
  const col = document.createElement('div');
  col.className = 'stack';
  col.style.gap = 'var(--space-5)';

  const h2 = document.createElement('h2');
  h2.textContent = 'Plan your pizza night';
  col.append(h2);
  append(col, renderSentence());

  col.append(
    renderChipGroup({
      legend: 'Pizza size',
      name: 'size',
      selected: String(choices.size),
      options: (Object.keys(SIZES) as unknown as string[]).map((k) => ({
        value: k,
        label: `${k}"`,
        sub: `${SIZES[Number(k) as PizzaSize]} g ball`,
        large: true,
      })),
      onChange: (v) => setRequest({ size: Number(v) as PizzaSize }),
    }),
    renderStepper({
      label: 'How many pizzas?',
      value: choices.pizzas,
      min: 1,
      max: 12,
      onChange: (pizzas) => setRequest({ pizzas }),
    }),
    renderChipGroup({
      legend: 'Bake day',
      name: 'day',
      selected: choices.day,
      options: offeredDays(now).map((d) => ({ value: d.value, label: d.label })),
      onChange: (day) => setRequest({ day }),
    }),
    renderChipGroup({
      legend: 'Ready to bake at',
      name: 'time',
      selected: choices.time,
      options: TIME_CHOICES.map((t) => ({ value: t.id, label: t.label, sub: timeChoiceSub(t.id) })),
      onChange: (time) => setRequest({ time: time as TimeChoiceId }),
    }),
  );
  append(col, renderTooSoon());

  const ready = choices.day !== null && choices.time !== null;
  const action = document.createElement('div');
  action.className = 'stack';
  if (!ready) {
    const hint = document.createElement('p');
    hint.className = 'muted';
    hint.id = 'plan-hint';
    hint.textContent = 'Choose a day and a time to make your plan.';
    action.append(hint);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-primary btn-block';
  button.textContent = 'Make my plan';
  button.disabled = !ready;
  if (!ready) button.setAttribute('aria-describedby', 'plan-hint');
  button.addEventListener('click', () => makePlan());
  action.append(button);
  col.append(action);
  append(col, renderMenu());

  main.append(h1, col);
  return main;
}
