// Countdown timer: dough ball inside a progress ring. Markup from design/reference/components/CountdownTimer.
// The visible time is always computed from a timestamp by the caller, never by adding up ticks.

export type TimerView = 'idle' | 'running' | 'paused' | 'finished';

export interface TimerProps {
  /** Accessible name stem, for example "Rest uncovered". */
  title: string;
  state: TimerView;
  totalMs: number;
  remainingMs: number;
  /** Whole minutes since a finished timer ended, shown when 1 or more. */
  endedAgoMin: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onAddMinute: () => void;
  onFinishEarly: () => void;
}

export const ALERT_NOTE = 'Alerts play while this page is open. Calendar alarms cover a locked phone.';

const STATE_WORDS: Record<TimerView, string> = {
  idle: 'Ready to start',
  running: 'Resting',
  paused: 'Paused',
  finished: 'Time is up',
};

export function formatDigits(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function spoken(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  if (s > 0 || m === 0) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ');
}

function percent(p: Pick<TimerProps, 'state' | 'totalMs' | 'remainingMs'>): number {
  if (p.state === 'finished') return 100;
  if (p.state === 'idle' || p.totalMs <= 0) return 0;
  const total = Math.max(p.totalMs, p.remainingMs);
  return Math.min(100, Math.max(0, ((total - p.remainingMs) / total) * 100));
}

function ariaLabel(p: Pick<TimerProps, 'title' | 'state' | 'remainingMs'>): string {
  if (p.state === 'finished') return `${p.title}, time is up`;
  if (p.state === 'paused') return `${p.title}, paused, ${spoken(p.remainingMs)} left`;
  if (p.state === 'idle') return `${p.title}, ${spoken(p.remainingMs)}`;
  return `${p.title}, ${spoken(p.remainingMs)} left`;
}

function div(className: string, text?: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = className;
  if (text !== undefined) d.textContent = text;
  return d;
}

function button(text: string, primary: boolean, key: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = primary ? 'btn btn-primary' : 'btn btn-secondary';
  b.textContent = text;
  b.dataset.key = key;
  b.addEventListener('click', onClick);
  return b;
}

/** Refresh only the changing parts (digits, ring, label) without rebuilding the timer. */
export function updateTimer(el: HTMLElement, p: Pick<TimerProps, 'title' | 'state' | 'totalMs' | 'remainingMs'>): void {
  const digits = el.querySelector('.timer-digits');
  const text = formatDigits(p.remainingMs);
  if (digits && digits.textContent !== text) {
    digits.textContent = text;
    el.setAttribute('aria-label', ariaLabel(p));
  }
  el.style.setProperty('--p', percent(p).toFixed(2));
}

export function renderTimer(p: TimerProps): HTMLElement {
  const el = div('timer');
  el.setAttribute('role', 'timer');
  if (p.state === 'paused') el.classList.add('is-paused');
  if (p.state === 'finished') el.classList.add('is-done');
  el.style.setProperty('--p', percent(p).toFixed(2));
  el.setAttribute('aria-label', ariaLabel(p));

  const ring = div('timer-ring');
  ring.setAttribute('aria-hidden', 'true');
  const ball = document.createElement('span');
  ball.className = 'timer-ball';
  const dough = document.createElement('span');
  dough.className = 'dough-ball';
  ball.append(dough);
  ring.append(ball);

  const digits = div('timer-digits', formatDigits(p.remainingMs));

  const state = div('timer-state');
  if (p.state === 'paused' || p.state === 'finished') {
    const glyph = document.createElement('span');
    glyph.className = p.state === 'paused' ? 'pause-bars' : 'tick';
    glyph.setAttribute('aria-hidden', 'true');
    state.append(glyph, ' ');
  }
  state.append(STATE_WORDS[p.state]);

  const actions = div('timer-actions');
  const minutes = Math.round(p.totalMs / 60_000);
  if (p.state === 'idle') actions.append(button(`Start ${minutes} min`, true, 'timer:start', p.onStart));
  if (p.state === 'running') {
    actions.append(
      button('Pause', false, 'timer:pause', p.onPause),
      button('+1 min', false, 'timer:plus', p.onAddMinute),
      button('Finish early', false, 'timer:finish', p.onFinishEarly),
    );
  }
  if (p.state === 'paused') {
    actions.append(
      button('Resume', true, 'timer:resume', p.onResume),
      button('+1 min', false, 'timer:plus', p.onAddMinute),
      button('Finish early', false, 'timer:finish', p.onFinishEarly),
    );
  }

  el.append(ring, digits, state);
  if (p.state === 'finished' && p.endedAgoMin >= 1) {
    el.append(div('timer-sub', `Ended ${p.endedAgoMin} min ago`));
  }
  if (actions.childElementCount > 0) el.append(actions);
  el.append(div('timer-sub', ALERT_NOTE));
  return el;
}
