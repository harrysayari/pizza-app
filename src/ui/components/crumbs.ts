// Crumbs: where you are in the plan, for example Poolish > Rest > Final dough > Final rest.
// Done parts show a tick and a hidden "done"; the current part shows its time. Never colour alone.

import type { Crumb } from '../../domain/progress';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** `timeText` is shown on the current part only (for example "10 min more"). */
export function renderCrumbs(crumbs: Crumb[], timeText: string): HTMLElement {
  const nav = el('nav', 'crumbs');
  nav.setAttribute('aria-label', 'Progress');
  const list = el('ol');
  crumbs.forEach((c, i) => {
    const li = el('li', `crumb is-${c.state}`);
    if (c.state === 'now') li.setAttribute('aria-current', 'step');
    const box = el('span', 'crumb-box');
    const name = el('span', 'crumb-name');
    if (c.state === 'done') {
      const tick = el('span', undefined, '✓ ');
      tick.setAttribute('aria-hidden', 'true');
      name.append(tick, c.label, el('span', 'sr-only', ' (done)'));
    } else {
      name.append(c.label);
    }
    box.append(name);
    if (c.state === 'now') box.append(el('span', 'crumb-time', timeText));
    li.append(box);
    if (i < crumbs.length - 1) {
      const sep = el('span', 'crumb-sep', '›');
      sep.setAttribute('aria-hidden', 'true');
      li.append(sep);
    }
    list.append(li);
  });
  nav.append(list);
  return nav;
}

/** Update the current part's time in place, for the live countdown. */
export function updateCrumbTime(root: ParentNode, timeText: string): void {
  const t = root.querySelector('.crumb-time');
  if (t && t.textContent !== timeText) t.textContent = timeText;
}
