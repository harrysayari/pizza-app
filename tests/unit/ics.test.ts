import { describe, expect, it } from 'vitest';
import { buildIcs } from '../../src/domain/ics';
import { buildPlan, type Plan, type Request } from '../../src/domain/schedule';

const MIN = 60_000;
const NOW = new Date(2026, 10, 15, 10, 0).getTime();
const EXPORTED = Date.UTC(2026, 10, 15, 10, 0, 0);
const REQ: Request = { size: 14, pizzas: 4, day: '2026-11-21', time: 'dinner' };

const unfold = (ics: string): string[] => ics.replace(/\r\n[ \t]/g, '').split('\r\n');
const utc = (t: number): string => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

function events(ics: string): string[][] {
  const lines = unfold(ics);
  const out: string[][] = [];
  let cur: string[] | null = null;
  for (const l of lines) {
    if (l === 'BEGIN:VEVENT') cur = [];
    else if (l === 'END:VEVENT') {
      out.push(cur!);
      cur = null;
    } else if (cur) cur.push(l);
  }
  return out;
}
const prop = (ev: string[], name: string): string | undefined =>
  ev.find((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`))?.replace(/^[^:]*:/, '');

describe('buildIcs', () => {
  const plan = buildPlan(REQ, NOW);
  const ics = buildIcs(plan, EXPORTED);

  it('uses CRLF line endings only and ends with a CRLF', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  it('has the calendar header and footer', () => {
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('PRODID:-//Pizza Dough Planner//EN');
    expect(lines).toContain('CALSCALE:GREGORIAN');
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR');
  });

  it('folds lines at 75 octets and unfolding restores the text', () => {
    const long: Plan = {
      ...plan,
      steps: plan.steps.map((s, i) => (i === 0 ? { ...s, instruction: 'é'.repeat(200) } : s)),
    };
    const out = buildIcs(long, EXPORTED);
    const enc = new TextEncoder();
    for (const l of out.split('\r\n')) expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    expect(out).toMatch(/\r\n /);
    expect(unfold(out).some((l) => l.includes('é'.repeat(200)))).toBe(true);
  });

  it('has one VEVENT per step', () => {
    expect(events(ics)).toHaveLength(plan.steps.length);
  });

  it('gives each event a stable UID from the request and bake time', () => {
    const again = events(buildIcs(buildPlan(REQ, NOW), EXPORTED + 5 * MIN));
    const evs = events(ics);
    const uids = evs.map((e) => prop(e, 'UID')!);
    expect(uids).toEqual(again.map((e) => prop(e, 'UID')!));
    expect(new Set(uids).size).toBe(uids.length);
    plan.steps.forEach((s, i) => expect(uids[i]).toMatch(new RegExp(`^[0-9a-f]+-${s.id}@pizza-dough-planner$`)));
    const other = events(buildIcs(buildPlan({ ...REQ, pizzas: 5 }, NOW), EXPORTED));
    expect(prop(other[0]!, 'UID')).not.toBe(uids[0]);
  });

  it('writes DTSTAMP, DTSTART and DTEND in UTC', () => {
    const evs = events(ics);
    plan.steps.forEach((s, i) => {
      expect(prop(evs[i]!, 'DTSTAMP')).toBe('20261115T100000Z');
      expect(prop(evs[i]!, 'DTSTART')).toBe(utc(s.startAt));
      expect(prop(evs[i]!, 'DTEND')).toBe(utc(Math.max(s.endAt, s.startAt + 5 * MIN)));
    });
  });

  it('gives a short active step at least 5 minutes', () => {
    const short: Plan = {
      ...plan,
      steps: plan.steps.map((s, i) => (i === 0 ? { ...s, endAt: s.startAt + 2 * MIN } : s)),
    };
    const ev = events(buildIcs(short, EXPORTED))[0]!;
    expect(prop(ev, 'DTEND')).toBe(utc(short.steps[0]!.startAt + 5 * MIN));
  });

  it('writes summary, transparency and a description with amounts', () => {
    const evs = events(ics);
    plan.steps.forEach((s, i) => {
      expect(prop(evs[i]!, 'SUMMARY')).toBe(`Pizza dough: ${s.title}`);
      expect(evs[i]).toContain('TRANSP:TRANSPARENT');
    });
    const mix = unfold(ics).find((l) => l.startsWith('DESCRIPTION:') && /\d+ g /.test(l));
    expect(mix).toBeDefined();
  });

  it('puts an alarm at the start of an active step and the end of a wait step', () => {
    const evs = events(ics);
    plan.steps.forEach((s, i) => {
      const alarm = evs[i]!.filter((l) => l.startsWith('TRIGGER'));
      expect(alarm).toHaveLength(1);
      expect(alarm[0]).toBe(`TRIGGER;VALUE=DATE-TIME:${utc(s.kind === 'active' ? s.startAt : s.endAt)}`);
      expect(evs[i]).toContain('ACTION:DISPLAY');
    });
  });

  it('describes a wait alarm as moving on to the next step', () => {
    const i = plan.steps.findIndex((s) => s.kind === 'wait');
    const alarms = unfold(ics).join('\n').split('BEGIN:VALARM').slice(1);
    expect(alarms.some((a) => a.includes(`DESCRIPTION:Time to move on: ${plan.steps[i + 1]!.title}`))).toBe(true);
  });

  it('puts the final-proof alarm at the bake time', () => {
    const idx = plan.steps.findIndex((s) => s.id === 'final-proof');
    expect(events(ics)[idx]).toContain(`TRIGGER;VALUE=DATE-TIME:${utc(plan.bakeAt)}`);
  });

  it('does not change with progress: the same plan gives the same file', () => {
    expect(buildIcs(plan, EXPORTED)).toBe(buildIcs({ ...plan }, EXPORTED));
  });
});
