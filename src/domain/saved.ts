// Rebuilding a plan from what was saved. Pure: no DOM, no storage, no real clock.
// Only the request, the bake instant and the fridge duration are stored. The steps are rebuilt
// from those three, with no validation against `now`, so reopening later never re-plans the
// schedule against a newer clock (data-model.md, Saved object).

import { scaleIngredients, ballGrams } from './amounts';
import { earliestReady, minimumLeadMinutes } from './earliest';
import { STEPS, isLongWait } from './recipe';
import type { Plan, Request, Step } from './schedule';
import { localDateOf, type Instant } from '../platform/clock';
import { tickTimer, type Timer } from './timer';

const MINUTE_MS = 60_000;

export interface SavedPlanInputs {
  request: Request;
  bakeAt: Instant;
  fridgeMinutes: number;
}

/** Steps back-timed from `bakeAt`, exactly as buildPlan laid them out when the plan was made. */
export function stepsFromSaved(saved: SavedPlanInputs): Step[] {
  const total = saved.request.pizzas * ballGrams(saved.request.size);
  const scaled = scaleIngredients(total);
  const steps: Step[] = [];
  let end = saved.bakeAt;
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const r = STEPS[i]!;
    const minutes = r.id === 'poolish-fridge' ? saved.fridgeMinutes : r.minutes;
    const startAt = end - minutes * MINUTE_MS;
    steps.unshift({
      id: r.id,
      title: r.title,
      instruction: r.instruction,
      kind: r.kind,
      startAt,
      endAt: end,
      amounts: scaled.filter((ing) => r.uses.includes(ing.id)),
      long: isLongWait({ kind: r.kind, minutes }),
      usesBallWeight: r.usesBallWeight === true,
      doneAt: null,
    });
    end = startAt;
  }
  return steps;
}

/**
 * The whole Plan for the store. `status` is re-evaluated against `now` when the page opens
 * (data-model.md, Plan), but a plan the cook has already started is never called too soon.
 */
export function planFromSaved(saved: SavedPlanInputs, now: Instant, started = false): Plan {
  const ball = ballGrams(saved.request.size);
  const tooSoon = !started && saved.bakeAt - now < minimumLeadMinutes() * MINUTE_MS;
  const earliest = tooSoon ? earliestReady(now, localDateOf(now)) : null;
  return {
    request: { ...saved.request },
    bakeAt: saved.bakeAt,
    ballGrams: ball,
    totalGrams: saved.request.pizzas * ball,
    fridgeMinutes: saved.fridgeMinutes,
    steps: stepsFromSaved(saved),
    status: tooSoon ? 'tooSoon' : 'ok',
    earliest: earliest ? { day: earliest.day, time: earliest.time.id } : null,
  };
}

/**
 * A saved timer made current. A timer for a step the plan does not have is dropped. A running
 * one recomputes its time left from `endAt`; one that ended while the page was closed becomes
 * finished, with the alert counted as given so reopening does not chime.
 */
export function restoreTimer(timer: Timer | null, stepIds: readonly string[], now: Instant): Timer | null {
  if (timer === null || !stepIds.includes(timer.stepId)) return null;
  if (timer.state === 'running') return tickTimer(timer, now).timer;
  return timer;
}
