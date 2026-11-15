import { buildIcs, planId } from '../../domain/ics';
import { copy, deliver } from '../../platform/calendar-file';
import { localDateOf, systemClock } from '../../platform/clock';
import { getPlan } from '../../state/actions/plan';

// Schedule action slots. renderStartSteps() is filled by US2 (lane E), renderCalendar() by US4 (lane G).
export function renderStartSteps(): string | Node {
  return '';
}

// ---- US4: Add to calendar (lane G) ----

type CalendarStatus = 'idle' | 'added' | 'failed' | 'copied' | 'manual';

const CHECK_ICON =
  '<svg class="banner-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>';
const CLOCK_ICON =
  '<svg class="banner-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

// Kept across re-renders so a tick elsewhere does not wipe the message; reset when the plan changes.
let calendarStatus: { key: string; value: CalendarStatus } = { key: '', value: 'idle' };

function calButton(label: string, kind: 'btn-primary' | 'btn-secondary', onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn ${kind} btn-block`;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function banner(ok: boolean, title: string, text: string, action?: HTMLElement): HTMLElement {
  const box = document.createElement('div');
  box.className = ok ? 'banner banner-ok' : 'banner';
  box.setAttribute('role', 'status');
  box.insertAdjacentHTML('beforeend', ok ? CHECK_ICON : CLOCK_ICON);
  const body = document.createElement('div');
  body.className = 'banner-body';
  const t = document.createElement('p');
  t.className = 'banner-title';
  t.textContent = title;
  const p = document.createElement('p');
  p.textContent = text;
  body.append(t, p);
  if (action) body.append(action);
  box.append(body);
  return box;
}

export function renderCalendar(): string | Node {
  const plan = getPlan();
  if (plan === null) return '';
  const key = `${planId(plan)}`;
  if (calendarStatus.key !== key) calendarStatus = { key, value: 'idle' };

  const wrap = document.createElement('div');
  wrap.className = 'stack';
  wrap.dataset.slot = 'calendar';
  let file = '';
  if (calendarStatus.value === 'manual') file = buildIcs(plan, systemClock.now());

  const draw = (): void => {
    wrap.replaceChildren();
    const status = calendarStatus.value;
    const add = calButton('Add to calendar', 'btn-secondary', () => void onAdd());
    wrap.append(add);
    if (status === 'added') {
      wrap.append(banner(true, 'Added to your calendar', 'You will get a reminder for every step.'));
    } else if (status !== 'idle') {
      const copyBtn =
        status === 'failed' ? calButton('Copy calendar file', 'btn-secondary', () => void onCopy()) : undefined;
      const title =
        status === 'copied' ? 'Calendar file copied' : 'Your device did not open the calendar file.';
      const text =
        status === 'copied'
          ? 'Paste it into a calendar app that can import text.'
          : status === 'manual'
            ? 'Select the text below and copy it by hand. Your plan is unchanged.'
            : 'Your plan is unchanged. You can copy the file instead.';
      wrap.append(banner(false, title, text, copyBtn));
      if (status === 'manual') {
        const area = document.createElement('textarea');
        area.readOnly = true;
        area.rows = 6;
        area.className = 'field-input';
        area.setAttribute('aria-label', 'Calendar file text');
        area.value = file;
        wrap.append(area);
        area.focus();
        area.select();
      }
    }
  };

  const set = (value: CalendarStatus): void => {
    calendarStatus = { key, value };
    draw();
  };

  async function onAdd(): Promise<void> {
    try {
      file = buildIcs(plan!, systemClock.now());
      const name = `pizza-dough-${localDateOf(plan!.bakeAt)}.ics`;
      const result = await deliver(file, name);
      set(result === 'failed' ? 'failed' : 'added');
    } catch {
      set('failed');
    }
  }

  async function onCopy(): Promise<void> {
    if (file === '') file = buildIcs(plan!, systemClock.now());
    set((await copy(file)) === 'copied' ? 'copied' : 'manual');
  }

  draw();
  return wrap;
}
