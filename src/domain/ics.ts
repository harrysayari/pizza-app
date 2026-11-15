// iCalendar (RFC 5545) export of a plan, one event per step. Pure: the export instant is a parameter.
// See specs/001-pizza-dough-planner/contracts/calendar-ics.md.

import { formatGrams } from './amounts';
import type { Plan, Step } from './schedule';
import type { Instant } from '../platform/clock';

const CRLF = '\r\n';
const MINUTE_MS = 60_000;
const MIN_EVENT_MINUTES = 5;
const MAX_OCTETS = 75;

/** 32-bit FNV-1a with a seed, as 8 hex digits. */
function fnv1a(text: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Stable id for a request and bake time, so re-adding the same plan updates events. */
export function planId(plan: Plan): string {
  const r = plan.request;
  const key = `${r.size}|${r.pizzas}|${r.day}|${r.time}|${plan.bakeAt}`;
  return fnv1a(key, 0x811c9dc5) + fnv1a(key, 0x01234567);
}

/** 20261121T193000Z */
function utc(instant: Instant): string {
  return new Date(instant).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

const encoder = new TextEncoder();

/** Fold one logical line at 75 octets, never splitting a character. */
function fold(line: string): string {
  const parts: string[] = [];
  let cur = '';
  let octets = 0;
  let limit = MAX_OCTETS;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (octets + n > limit) {
      parts.push(cur);
      cur = '';
      octets = 0;
      limit = MAX_OCTETS - 1; // the continuation space counts
    }
    cur += ch;
    octets += n;
  }
  parts.push(cur);
  return parts.join(CRLF + ' ');
}

function describe(step: Step): string {
  const text = [step.instruction];
  if (step.amounts.length > 0) {
    text.push(step.amounts.map((a) => `${formatGrams(a.grams)} ${a.name.toLowerCase()}`).join(', '));
  }
  return text.join('\n');
}

function eventLines(plan: Plan, step: Step, next: Step | undefined, id: string, stamp: string): string[] {
  const end = Math.max(step.endAt, step.startAt + MIN_EVENT_MINUTES * MINUTE_MS);
  const wait = step.kind === 'wait';
  const trigger = wait ? step.endAt : step.startAt;
  const alarmText = wait ? (next ? `Time to move on: ${next.title}` : 'Time to bake.') : step.title;
  return [
    'BEGIN:VEVENT',
    `UID:${id}-${step.id}@pizza-dough-planner`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${utc(step.startAt)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(`Pizza dough: ${step.title}`)}`,
    `DESCRIPTION:${escapeText(describe(step))}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(alarmText)}`,
    `TRIGGER;VALUE=DATE-TIME:${utc(trigger)}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

export function buildIcs(plan: Plan, exportedAt: Instant): string {
  const id = planId(plan);
  const stamp = utc(exportedAt);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pizza Dough Planner//EN',
    'CALSCALE:GREGORIAN',
    ...plan.steps.flatMap((s, i) => eventLines(plan, s, plan.steps[i + 1], id, stamp)),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join(CRLF) + CRLF;
}
