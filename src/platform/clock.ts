/** Milliseconds since epoch. */
export type Instant = number;

export interface Clock {
  now(): Instant;
}

export const systemClock: Clock = { now: () => Date.now() };

/** Local calendar date, YYYY-MM-DD, of an instant. */
export function localDateOf(instant: Instant): string {
  const d = new Date(instant);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
