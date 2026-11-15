// Back-timed schedule. Pure: no DOM, no storage, no real clock. Callers pass `now`.
// Durations add as absolute milliseconds, so daylight-saving changes never alter a step's length.

import { ballGrams, scaleIngredients, type Ingredient } from './amounts';
import {
  FRIDGE_DEFAULT_MINUTES,
  FRIDGE_RANGE,
  SIZES,
  STEPS,
  TIME_CHOICES,
  isLongWait,
  type PizzaSize,
  type StepKind,
  type TimeChoiceId,
} from './recipe';
import { earliestReady, minimumLeadMinutes } from './earliest';
import { localDateOf, type Instant } from '../platform/clock';

const MINUTE_MS = 60_000;

export interface Request {
  size: PizzaSize;
  /** Integer 1 to 12. */
  pizzas: number;
  /** Local date, YYYY-MM-DD: tomorrow or one of the next six days after that. */
  day: string;
  time: TimeChoiceId;
}

export interface Step {
  id: string;
  title: string;
  instruction: string;
  kind: StepKind;
  startAt: Instant;
  endAt: Instant;
  amounts: Ingredient[];
  long: boolean;
  usesBallWeight: boolean;
  doneAt: Instant | null;
}

export interface Plan {
  request: Request;
  bakeAt: Instant;
  ballGrams: number;
  totalGrams: number;
  fridgeMinutes: number;
  steps: Step[];
  status: 'ok' | 'tooSoon';
  /** Set when `status` is `tooSoon` (earliest.ts), otherwise null. */
  earliest: { day: string; time: TimeChoiceId } | null;
}

export interface BuildOptions {
  fridgeMinutes?: number;
}

function stepMinutes(id: string, planning: number, fridgeMinutes: number): number {
  return id === 'poolish-fridge' ? fridgeMinutes : planning;
}

export { minimumLeadMinutes };

function parseDay(day: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new RangeError(`day must be YYYY-MM-DD, got "${day}"`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(y, m - 1, d);
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) {
    throw new RangeError(`day is not a real date: "${day}"`);
  }
  return { y, m, d };
}

/** Local calendar days from the date of `now` to `day` (DST-safe: compares calendar dates). */
function daysAhead(now: Instant, day: { y: number; m: number; d: number }): number {
  const n = new Date(now);
  const a = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  const b = Date.UTC(day.y, day.m - 1, day.d);
  return Math.round((b - a) / 86_400_000);
}

function validate(request: Request, now: Instant, opts: BuildOptions): { y: number; m: number; d: number } {
  if (!(request.size in SIZES)) throw new RangeError(`size must be 12, 14 or 16, got ${request.size}`);
  if (!Number.isInteger(request.pizzas) || request.pizzas < 1 || request.pizzas > 12) {
    throw new RangeError(`pizzas must be an integer from 1 to 12, got ${request.pizzas}`);
  }
  if (!TIME_CHOICES.some((t) => t.id === request.time)) {
    throw new RangeError(`unknown time choice "${request.time}"`);
  }
  const day = parseDay(request.day);
  const ahead = daysAhead(now, day);
  if (ahead < 1 || ahead > 7) throw new RangeError('day must be tomorrow or one of the next six days after it');
  const f = opts.fridgeMinutes;
  if (f !== undefined && (!Number.isInteger(f) || f < FRIDGE_RANGE[0] || f > FRIDGE_RANGE[1])) {
    throw new RangeError(`fridgeMinutes must be an integer from ${FRIDGE_RANGE[0]} to ${FRIDGE_RANGE[1]}`);
  }
  return day;
}

export function buildPlan(request: Request, now: Instant, opts: BuildOptions = {}): Plan {
  const day = validate(request, now, opts);
  const choice = TIME_CHOICES.find((t) => t.id === request.time)!;
  const [hh, mm] = choice.time.split(':').map(Number) as [number, number];
  const bakeAt = new Date(day.y, day.m - 1, day.d, hh, mm).getTime();

  // The fridge rest starts at 1080 and shortens toward 960 only as far as needed to keep the first
  // step from being in the past. An explicit fridgeMinutes is used as given.
  const available = Math.floor((bakeAt - now) / MINUTE_MS);
  const fixedMinutes = minimumLeadMinutes() - FRIDGE_RANGE[0];
  const fridgeMinutes =
    opts.fridgeMinutes ??
    Math.max(FRIDGE_RANGE[0], Math.min(FRIDGE_DEFAULT_MINUTES, available - fixedMinutes));
  const ball = ballGrams(request.size);
  const totalGrams = request.pizzas * ball;
  const scaled = scaleIngredients(totalGrams);

  // Back-time from bakeAt: the last step ends exactly there, each earlier step ends where the next starts.
  const steps: Step[] = [];
  let end = bakeAt;
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const r = STEPS[i]!;
    const minutes = stepMinutes(r.id, r.minutes, fridgeMinutes);
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

  const tooSoon = bakeAt - now < minimumLeadMinutes() * MINUTE_MS;
  const earliest = tooSoon ? earliestReady(now, localDateOf(now)) : null;
  return {
    request: { ...request },
    bakeAt,
    ballGrams: ball,
    totalGrams,
    fridgeMinutes,
    steps,
    status: tooSoon ? 'tooSoon' : 'ok',
    earliest: earliest ? { day: earliest.day, time: earliest.time.id } : null,
  };
}

// ---- Display helpers (pure; local time zone of the runtime) ----

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** "7:25 pm" */
export function formatClock(instant: Instant): string {
  const d = new Date(instant);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

/** "Fri" */
export function formatWeekday(instant: Instant): string {
  return WEEKDAYS[new Date(instant).getDay()]!;
}

/** "15 min", "1 hr", "1 hr 30 min", "18 hr" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}
