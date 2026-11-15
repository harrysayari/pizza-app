// Share link: the four choices in the address (contracts/share-link.md). Choices only, never
// progress, ticks or timers. Invalid or missing params are ignored, never an error.

import { SIZES, TIME_CHOICES } from '../domain/recipe';
import type { Request } from '../domain/schedule';

export type LinkChoices = Partial<Request>;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function dayNumber(day: string): number | null {
  const m = DAY.exec(day);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return Math.round(check.getTime() / 86_400_000);
}

/** Tomorrow up to six days after tomorrow, counted from the local date `today`. */
function dayInWindow(day: string, today: string): boolean {
  const n = dayNumber(day);
  const t = dayNumber(today);
  if (n === null || t === null) return false;
  return n >= t + 1 && n <= t + 7;
}

function searchOf(url: string): URLSearchParams {
  try {
    const q = url.indexOf('?');
    if (q < 0) return new URLSearchParams();
    const hash = url.indexOf('#', q);
    return new URLSearchParams(url.slice(q + 1, hash < 0 ? undefined : hash));
  } catch {
    return new URLSearchParams();
  }
}

/** The valid choices in `url`. `today` is the local date, YYYY-MM-DD. */
export function readLink(url: string, today: string): LinkChoices {
  const out: LinkChoices = {};
  try {
    const p = searchOf(url);
    const s = p.get('s');
    if (s !== null && /^\d+$/.test(s) && Number(s) in SIZES) out.size = Number(s) as Request['size'];
    const n = p.get('n');
    if (n !== null && /^\d+$/.test(n) && Number(n) >= 1 && Number(n) <= 12) out.pizzas = Number(n);
    const d = p.get('d');
    if (d !== null && dayInWindow(d, today)) out.day = d;
    const t = p.get('t');
    const time = TIME_CHOICES.find((c) => c.id === t);
    if (time) out.time = time.id;
  } catch {
    // An unreadable address carries no choices.
  }
  return out;
}

/** A link built from the request alone. `base` is the page address; its query and hash are dropped. */
export function writeLink(request: Request, base: string = defaultBase()): string {
  const cut = base.search(/[?#]/);
  const clean = cut < 0 ? base : base.slice(0, cut);
  const p = new URLSearchParams({
    s: String(request.size),
    n: String(request.pizzas),
    d: request.day,
    t: request.time,
  });
  return `${clean}?${p.toString()}`;
}

function defaultBase(): string {
  try {
    return `${location.origin}${location.pathname}`;
  } catch {
    return '/';
  }
}
