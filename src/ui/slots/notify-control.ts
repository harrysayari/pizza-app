// The timer-notification control (spec 002, FR-006..008, 015, 017). One control, four states shown in
// words and an icon, each with one next step. The browser's permission prompt appears only after the
// user taps "Turn on notifications" and then "Continue" on the plain explanation (FR-007).

import { controlState, turnOff, turnOn, type ControlState } from '../../state/actions/notify';
import { store, type AppState } from '../../state/store';

let explaining = false;

function setExplaining(value: boolean): void {
  explaining = value;
  store.update({}); // the shell redraws on every update
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(text: string, primary: boolean, key: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', primary ? 'btn btn-primary' : 'btn btn-secondary', text);
  b.type = 'button';
  b.dataset.key = key;
  b.addEventListener('click', onClick);
  return b;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** A small icon per state, so the state never rests on colour alone. */
function icon(state: ControlState['state']): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'notify-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  const d: Record<ControlState['state'], string> = {
    on: 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 21h4M9 12l2 2 4-4',
    off: 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 21h4',
    blocked: 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 21h4M4 4l16 16',
    unavailable: 'M12 8v5M12 16.5v.5M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z',
  };
  path.setAttribute('d', d[state]);
  svg.append(path);
  return svg;
}

const WORDS: Record<ControlState['state'], string> = {
  on: 'Notifications are on',
  off: 'Notifications are off',
  blocked: 'Notifications are blocked',
  unavailable: 'Notifications are not available',
};

/** What each state means and what to do next (FR-008: no dead ends). */
function nextStep(c: ControlState): string {
  if (c.state === 'blocked') {
    return 'To use them, allow notifications for this site in your browser or phone settings, then come back here.';
  }
  if (c.state === 'unavailable') {
    return c.reason === 'home-screen'
      ? 'On an iPhone, notifications work only for an app on your Home Screen. Tap Share, then Add to Home Screen, then open the app from there.'
      : 'This browser cannot show notifications. The alert on the screen and calendar alarms still work.';
  }
  if (c.state === 'on') return 'When a timer ends and this app is in the background, your phone can show a notification.';
  return 'Get a notification when a timer ends and this app is in the background.';
}

export const HONESTY_NOTE =
  'Delivery depends on your phone and can be late or missed. Calendar alarms are the backup for a locked phone.';

function explanation(): HTMLElement {
  const box = el('section', 'banner');
  box.setAttribute('aria-label', 'Before you turn on notifications');
  box.dataset.slot = 'notify-explain';
  box.style.gridTemplateColumns = '1fr';
  const body = el('div', 'banner-body');
  body.append(
    el('p', 'banner-title', 'Turn on timer notifications?'),
    el(
      'p',
      undefined,
      'Your phone will show "Time is up" with the step name when a timer ends and this app is in the background. Your browser asks for permission next. Nothing is sent to us or to anyone else: your phone makes the notification itself.',
    ),
    el('p', undefined, `It only works while this app is still running in the background. ${HONESTY_NOTE} You can turn it off at any time.`),
    button('Continue', true, 'notify:continue', () => {
      explaining = false;
      void turnOn(store);
    }),
    button('Not now', false, 'notify:cancel', () => setExplaining(false)),
  );
  box.append(body);
  return box;
}

/** `heading` is the heading level: 2 in settings, 3 inside step mode (under the step's own heading). */
export function renderNotifyControl(state: AppState, heading: 'h2' | 'h3' = 'h2'): HTMLElement {
  const c = controlState(state.preferences);
  const box = el('section', 'stack notify-control');
  box.dataset.slot = 'notify-control';
  box.dataset.state = c.state;
  box.setAttribute('aria-labelledby', 'notify-heading');

  const h = el(heading, undefined, 'Timer notifications');
  h.id = 'notify-heading';
  const status = el('p', 'notify-state');
  status.append(icon(c.state), ' ', el('span', undefined, WORDS[c.state]));
  box.append(h, status, el('p', undefined, nextStep(c)));

  if (c.state === 'off') {
    if (explaining) box.append(explanation());
    else box.append(button('Turn on notifications', false, 'notify:open', () => setExplaining(true)));
  } else if (c.state === 'on') {
    box.append(el('p', undefined, HONESTY_NOTE), button('Turn off notifications', false, 'notify:off', () => turnOff(store)));
  }
  return box;
}
