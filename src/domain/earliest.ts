// Earliest ready time (US3). Pure: callers pass `now` and today's local date.

import { FRIDGE_RANGE, STEPS, TIME_CHOICES, type TimeChoice } from './recipe';
import type { Instant } from '../platform/clock';

const MINUTE_MS = 60_000;

/** Minutes from the first step to bake time with the fridge at its shortest (1313 by default). */
export function minimumLeadMinutes(): number {
  return STEPS.reduce((n, s) => n + (s.id === 'poolish-fridge' ? FRIDGE_RANGE[0] : s.minutes), 0);
}

function parseLocalDate(day: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new RangeError(`day must be YYYY-MM-DD, got "${day}"`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function bakeInstant(y: number, m: number, d: number, time: TimeChoice): Instant {
  const [hh, mm] = time.time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm).getTime();
}

/** True when baking on `day` at `time` leaves less than the minimum lead after `now`. */
export function isTooSoon(now: Instant, day: string, time: TimeChoice): boolean {
  const { y, m, d } = parseLocalDate(day);
  return bakeInstant(y, m, d, time) - now < minimumLeadMinutes() * MINUTE_MS;
}

export interface EarliestReady {
  /** Local date, YYYY-MM-DD. */
  day: string;
  time: TimeChoice;
  bakeAt: Instant;
}

/**
 * The first slot (Lunch, Early dinner or Dinner, day by day from `today`) whose bake time is at
 * least the minimum lead after `now`. Within the next eight days there is always one.
 */
export function earliestReady(now: Instant, today: string): EarliestReady {
  const { y, m, d } = parseLocalDate(today);
  const lead = minimumLeadMinutes() * MINUTE_MS;

  for (let ahead = 0; ahead <= 8; ahead++) {
    for (const time of TIME_CHOICES) {
      const bakeAt = bakeInstant(y, m, d + ahead, time);
      if (bakeAt - now >= lead) {
        const date = new Date(y, m - 1, d + ahead);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return { day: `${date.getFullYear()}-${mm}-${dd}`, time, bakeAt };
      }
    }
  }
  throw new RangeError('no slot fits within eight days');
}
