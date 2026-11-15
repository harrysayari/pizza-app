// US1 actions: choices, making the plan, ticking ingredients, returning to Plan.
// The store's `request` only ever holds a complete request. Choices made before a day and a time
// exist live in `pending`, tied to the request they were started from.

import { buildPlan, type Plan, type Request } from '../../domain/schedule';
import { TIME_CHOICES, type PizzaSize, type TimeChoiceId } from '../../domain/recipe';
import { systemClock, localDateOf, type Clock } from '../../platform/clock';
import { store as appStore, type RequestState, type Store } from '../store';

export interface Choices {
  size: PizzaSize;
  pizzas: number;
  day: string | null;
  time: TimeChoiceId | null;
}

export interface OfferedDay {
  /** YYYY-MM-DD */
  value: string;
  /** "Tomorrow" or a short weekday name. */
  label: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DEFAULT_CHOICES: Choices = { size: 14, pizzas: 4, day: null, time: null };

let pending: { base: RequestState | null; choices: Choices } | null = null;

/** Tomorrow plus the next six days, by weekday name. Never dates. */
export function offeredDays(now: number): OfferedDay[] {
  const t = new Date(now);
  const out: OfferedDay[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i, 12);
    out.push({ value: localDateOf(d.getTime()), label: i === 1 ? 'Tomorrow' : WEEKDAYS[d.getDay()]! });
  }
  return out;
}

/** The choices to show: pending ones, else the saved request, else the defaults. */
export function currentChoices(store: Store = appStore, now: number = systemClock.now()): Choices {
  const s = store.getState();
  const offered = new Set(offeredDays(now).map((d) => d.value));
  const raw: Choices =
    pending && pending.base === s.request
      ? pending.choices
      : s.request
        ? { ...s.request }
        : { ...DEFAULT_CHOICES };
  return { ...raw, day: raw.day !== null && offered.has(raw.day) ? raw.day : null };
}

export function getPlan(store: Store = appStore): Plan | null {
  return store.getState().plan as Plan | null;
}

function complete(c: Choices): c is Request {
  return c.day !== null && c.time !== null;
}

/** Ticks belong to the amounts, so they clear when the size or the count changes. */
function ticksFor(store: Store, next: Request): Record<string, boolean> {
  const prev = store.getState().request;
  const sameAmounts = prev !== null && prev.size === next.size && prev.pizzas === next.pizzas;
  return sameAmounts ? store.getState().ticked : {};
}

/** Change one or more choices. Once a plan exists it is rebuilt at once (FR-014). */
export function setRequest(
  patch: Partial<Choices>,
  store: Store = appStore,
  clock: Clock = systemClock,
): void {
  const now = clock.now();
  const merged: Choices = { ...currentChoices(store, now), ...patch };
  const s = store.getState();

  if (!complete(merged)) {
    pending = { base: s.request, choices: merged };
    store.update({}); // choices are not in the store state; ask the shell to re-render
    return;
  }

  pending = null;
  const request: RequestState = { ...merged };
  const ticked = ticksFor(store, request);
  if (s.plan !== null) {
    const plan = buildPlan(request, now);
    store.update({ request, plan, bakeAt: plan.bakeAt, fridgeMinutes: plan.fridgeMinutes, ticked });
  } else {
    store.update({ request, ticked });
  }
}

/** Build the plan from the current choices and show the schedule. */
export function makePlan(store: Store = appStore, clock: Clock = systemClock): void {
  const now = clock.now();
  const choices = currentChoices(store, now);
  if (!complete(choices)) return;
  const request: RequestState = { ...choices };
  const plan = buildPlan(request, now);
  pending = null;
  store.update({
    request,
    plan,
    bakeAt: plan.bakeAt,
    fridgeMinutes: plan.fridgeMinutes,
    ticked: ticksFor(store, request),
    progress: { ...store.getState().progress, screen: 'schedule' },
  });
}

export function toggleTick(id: string, store: Store = appStore): void {
  const ticked = { ...store.getState().ticked };
  if (ticked[id]) delete ticked[id];
  else ticked[id] = true;
  store.update({ ticked });
}

/** Back to Plan with the choices kept. */
export function changeChoices(store: Store = appStore): void {
  store.update({ progress: { ...store.getState().progress, screen: 'plan' } });
}

/** Display text for a time choice's clock, "6:00" style, no am or pm. */
export function timeChoiceSub(id: TimeChoiceId): string {
  const t = TIME_CHOICES.find((c) => c.id === id)!.time;
  const [h, m] = t.split(':') as [string, string];
  return `${Number(h) % 12 === 0 ? 12 : Number(h) % 12}:${m}`;
}

/**
 * The shell replaces the whole screen on every state change. Call this while building a screen
 * to give keyboard focus back to the control (by data-key) that had it before.
 */
export function preserveFocus(): void {
  const active = document.activeElement;
  const key = active instanceof HTMLElement ? active.dataset.key : undefined;
  if (!key) return;
  queueMicrotask(() => {
    const next = document.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
    // preventScroll: giving focus back must not move the page (a new screen starts at the top).
    if (next && !(next instanceof HTMLButtonElement && next.disabled)) next.focus({ preventScroll: true });
  });
}
