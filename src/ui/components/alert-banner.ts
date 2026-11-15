// The timer alert: a banner pinned to the top of every screen until the user acts on it.
// Words and an icon carry the state, never colour alone. Announced to screen readers when it appears.

import type { TimerAlert } from '../../domain/alert';

export interface AlertBannerProps {
  alert: TimerAlert;
  onDone: () => void;
  onPlusMinute: () => void;
  onRemindLater: () => void;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function bell(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'banner-icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 21h4');
  svg.append(path);
  return svg;
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

export function agoText(agoMs: number): string {
  const min = Math.floor(agoMs / 60_000);
  if (min < 1) return '';
  return `Ended ${min} min ago`;
}

export function renderAlertBanner(p: AlertBannerProps): HTMLElement {
  const { alert } = p;
  const region = document.createElement('div');
  region.className = 'alert-region';
  region.dataset.slot = 'timer-alert';

  const root = document.createElement('div');
  root.className = 'banner banner-alert';
  root.setAttribute('role', 'alert');

  const body = document.createElement('div');
  body.className = 'banner-body';
  const title = document.createElement('p');
  title.className = 'banner-title';
  title.textContent = 'Time is up';
  const text = document.createElement('p');
  const ago = agoText(alert.agoMs);
  text.textContent = ago === '' ? alert.title : `${alert.title}. ${ago}`;

  const actions = document.createElement('div');
  actions.className = 'alert-actions';
  actions.append(
    button('Done, next step', true, 'alert:done', p.onDone),
    alert.kind === 'timer'
      ? button('+1 min', false, 'alert:plus', p.onPlusMinute)
      : button('Remind me in 15 min', false, 'alert:later', p.onRemindLater),
  );
  body.append(title, text, actions);
  root.append(bell(), body);
  region.append(root);
  return region;
}
