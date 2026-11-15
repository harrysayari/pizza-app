// US6 slot: the way into settings and sharing, on every screen, and the one-time question
// when a shared link arrives while a plan is already saved.

import { getPendingShare, resolveShare } from '../../state/hydrate';
import { openSettings } from '../screens/settings';

function button(text: string, className: string, key: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = text;
  b.dataset.key = key;
  b.addEventListener('click', onClick);
  return b;
}

/** The Settings button. The shell adds it to every screen that does not already have one. */
export function renderMenu(): string | Node {
  const wrap = document.createElement('div');
  wrap.className = 'menu-slot';
  wrap.dataset.slot = 'menu';
  wrap.style.marginBlockStart = 'var(--space-5)';
  wrap.append(button('Settings', 'btn btn-secondary btn-block', 'menu', () => openSettings()));
  return wrap;
}

/** "Open the shared plan or keep your current one?" Empty when no link is waiting. */
export function renderShareChoice(): string | Node {
  if (getPendingShare() === null) return '';
  const box = document.createElement('section');
  box.className = 'banner';
  box.setAttribute('aria-label', 'Shared plan');
  box.dataset.slot = 'share-choice';
  box.style.gridTemplateColumns = '1fr';
  const body = document.createElement('div');
  body.className = 'banner-body';
  const title = document.createElement('p');
  title.className = 'banner-title';
  title.textContent = 'Open the shared plan or keep your current one?';
  const text = document.createElement('p');
  text.textContent = 'Opening the shared plan replaces your saved plan, ticks and timer.';
  body.append(
    title,
    text,
    button('Open the shared plan', 'btn btn-primary', 'share-open', () => resolveShare(true)),
    button('Keep my current plan', 'btn btn-secondary', 'share-keep', () => resolveShare(false)),
  );
  box.append(body);
  return box;
}
