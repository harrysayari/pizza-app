// Say or type the request (contracts/request-sentence.md). Pure, local, rule-based. Never throws,
// never guesses: anything it cannot read is left out.

import { TIME_CHOICES, type PizzaSize, type TimeChoiceId } from './recipe';

export type LocalDate = string; // YYYY-MM-DD

export interface ParsedRequest {
  size?: PizzaSize;
  pizzas?: number;
  day?: LocalDate;
  time?: TimeChoiceId;
  /** Human labels for the tags, in the order pizzas, size, day, time. */
  understood: string[];
}

export type RequestField = 'pizzas' | 'size' | 'day' | 'time';

const MAX_LENGTH = 500;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const SIZE_WORDS: Readonly<Record<string, number>> = { twelve: 12, fourteen: 14, sixteen: 16 };
const WEEKDAY_INDEX: Readonly<Record<string, number>> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};

// Words first, then the three clock times. Leftmost match wins.
const TIME_RE =
  /\bearly\s+(?:dinner|supper)\b|\blunch(?:time)?\b|\b(?:dinner|supper)\b|\b12[:.]30\s*(?:pm|p\.m\.)?|\b6[:.]00\s*(?:pm|p\.m\.)?|\b6\s*(?:pm|p\.m\.)|\b7[:.]30\s*(?:pm|p\.m\.)?/;
const SIZE_RE = /\b(\d+|twelve|fourteen|sixteen)\s*-?\s*(?:inch(?:es)?|in|")(?![a-z])/g;
const NUM = '(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
const COUNT_RE = new RegExp(`\\b${NUM}\\s+(?:#\\s*)?(?:pizzas?\\b|dough\\s*balls?\\b|balls?\\b)|\\b${NUM}\\s+#`, 'g');
const DAY_RE = new RegExp(`\\b(tomorrow|${Object.keys(WEEKDAY_INDEX).join('|')})\\b`);

function timeOf(match: string): TimeChoiceId {
  if (/early/.test(match)) return 'early';
  if (/lunch|12/.test(match)) return 'lunch';
  if (/6/.test(match)) return 'early';
  return 'dinner'; // dinner, supper, 7:30
}

function toNumber(token: string): number {
  return NUMBER_WORDS[token] ?? Number(token);
}

function parseDate(d: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  const ok = date.getFullYear() === Number(m[1]) && date.getMonth() === Number(m[2]) - 1 && date.getDate() === Number(m[3]);
  return ok ? date : null;
}

function format(d: Date): LocalDate {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function resolveDay(word: string, today: LocalDate): { day: LocalDate; label: string } | null {
  const base = parseDate(today);
  if (!base) return null;
  const offset =
    word === 'tomorrow'
      ? 1
      : (() => {
          const diff = ((WEEKDAY_INDEX[word] ?? 0) - base.getDay() + 7) % 7;
          return diff === 0 ? 7 : diff;
        })();
  const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, 12);
  return { day: format(target), label: word === 'tomorrow' ? 'Tomorrow' : WEEKDAYS[target.getDay()]! };
}

export function labelFor(field: RequestField, value: string | number): string {
  switch (field) {
    case 'pizzas':
      return `${value} ${value === 1 ? 'pizza' : 'pizzas'}`;
    case 'size':
      return `${value}"`;
    case 'day':
      return String(value);
    case 'time':
      return TIME_CHOICES.find((t) => t.id === value)?.label ?? String(value);
  }
}

export function parseRequest(text: string, today: LocalDate): ParsedRequest {
  try {
    return parse(String(text ?? '').slice(0, MAX_LENGTH).toLowerCase(), today);
  } catch {
    return { understood: [] };
  }
}

function parse(input: string, today: LocalDate): ParsedRequest {
  const out: ParsedRequest = { understood: [] };
  let rest = input;
  const labels: Partial<Record<RequestField, string>> = {};

  const t = TIME_RE.exec(rest);
  if (t) {
    out.time = timeOf(t[0]);
    labels.time = labelFor('time', out.time);
    rest = rest.slice(0, t.index) + ' ' + rest.slice(t.index + t[0].length);
  }

  // Every size phrase becomes "#", so "four 18-inch pizzas" still yields the count.
  rest = rest.replace(SIZE_RE, (whole, num: string) => {
    const n = SIZE_WORDS[num] ?? Number(num);
    if (out.size === undefined && (n === 12 || n === 14 || n === 16)) out.size = n;
    return ` # `;
  });
  if (out.size !== undefined) labels.size = labelFor('size', out.size);

  for (const m of rest.matchAll(COUNT_RE)) {
    const n = toNumber((m[1] ?? m[2])!);
    if (Number.isInteger(n) && n >= 1 && n <= 12) {
      out.pizzas = n;
      labels.pizzas = labelFor('pizzas', n);
      break;
    }
  }

  const d = DAY_RE.exec(rest);
  if (d) {
    const resolved = resolveDay(d[1]!, today);
    if (resolved) {
      out.day = resolved.day;
      labels.day = resolved.label;
    }
  }

  out.understood = (['pizzas', 'size', 'day', 'time'] as const).flatMap((f) => (labels[f] ? [labels[f]!] : []));
  // Keep only the fields that were read, so toEqual and "set only these" both stay simple.
  for (const k of ['size', 'pizzas', 'day', 'time'] as const) if (out[k] === undefined) delete out[k];
  return out;
}
