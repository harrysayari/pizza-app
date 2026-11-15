// US3 slot: "too soon" banner with the earliest ready time, and "Too soon" labels on the chips
// that cannot work. Shown above the Make-my-plan button and above the timeline.

import { earliestReady, isTooSoon } from '../../domain/earliest';
import { TIME_CHOICES, type TimeChoiceId } from '../../domain/recipe';
import { buildPlan, formatClock, type Plan } from '../../domain/schedule';
import { localDateOf, systemClock } from '../../platform/clock';
import { currentChoices, getPlan, makePlan, offeredDays, setRequest } from '../../state/actions/plan';
import { getState } from '../../state/store';
import { renderBanner } from '../components/banner';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function dayTime(instant: number): string {
  return `${DAY_NAMES[new Date(instant).getDay()]} ${formatClock(instant)}`;
}

function labelChips(now: number, day: string | null): void {
  const mark = (name: string, value: string): void => {
    const face = document
      .querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)
      ?.closest('label')
      ?.querySelector('.chip-face');
    if (!face) return;
    face.querySelector('.chip-sub')?.remove();
    const sub = document.createElement('span');
    sub.className = 'chip-sub';
    sub.textContent = 'Too soon';
    face.append(sub);
  };
  for (const d of offeredDays(now)) {
    if (TIME_CHOICES.every((t) => isTooSoon(now, d.value, t))) mark('day', d.value);
  }
  if (day !== null) {
    for (const t of TIME_CHOICES) if (isTooSoon(now, day, t)) mark('time', t.id);
  }
}

export function renderTooSoon(): string | Node {
  const now = systemClock.now();
  const choices = currentChoices(undefined, now);
  const onSchedule = getState().progress.screen === 'schedule';

  // The shell builds the screen first and attaches it after, so label the chips once it is in place.
  if (!onSchedule) queueMicrotask(() => labelChips(now, choices.day));

  let plan: Plan | null;
  if (onSchedule) {
    plan = getPlan();
  } else if (choices.day !== null && choices.time !== null) {
    plan = buildPlan({ size: choices.size, pizzas: choices.pizzas, day: choices.day, time: choices.time }, now);
  } else {
    plan = null;
  }
  if (plan === null || plan.status !== 'tooSoon') return '';

  const earliest = earliestReady(now, localDateOf(now));
  const label = dayTime(earliest.bakeAt);
  return renderBanner({
    title: `Not enough time for ${dayTime(plan.bakeAt)}`,
    body: `This dough needs about 22 hours. The earliest it can be ready is ${label}.`,
    action: {
      label: `Use ${label}`,
      onClick: () => {
        setRequest({ day: earliest.day, time: earliest.time.id as TimeChoiceId });
        makePlan();
      },
    },
  });
}
