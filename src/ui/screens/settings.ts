// Settings: share the plan, sound, theme, and the two resets. Reached from the menu on every
// screen. Whether it is open is page state only; the saved screen stays the one underneath.

import { copy } from '../../platform/calendar-file';
import { setMuted } from '../../state/actions/timer';
import { clearSavedData, startNewPlan } from '../../state/hydrate';
import { writeLink } from '../../state/share-link';
import { store, type AppState, type Theme } from '../../state/store';
import { renderChipGroup } from '../components/chip';
import { renderToggle } from '../components/toggle';
import { renderNotifyControl } from '../slots/notify-control';

type Confirming = 'new' | 'clear' | null;
type ShareStatus = 'idle' | 'copied' | 'manual';

let open = false;
let confirming: Confirming = null;
let share: { status: ShareStatus; link: string } = { status: 'idle', link: '' };

export function isSettingsOpen(): boolean {
  return open;
}

function set(next: { open?: boolean; confirming?: Confirming; share?: typeof share }): void {
  if (next.open !== undefined) open = next.open;
  if (next.confirming !== undefined) confirming = next.confirming;
  if (next.share !== undefined) share = next.share;
  store.update({}); // the shell redraws on every update
}

export function openSettings(): void {
  set({ open: true, confirming: null, share: { status: 'idle', link: '' } });
}

export function closeSettings(): void {
  set({ open: false, confirming: null });
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function button(text: string, className: string, key: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  b.dataset.key = key;
  b.addEventListener('click', onClick);
  return b;
}

function confirmBox(title: string, text: string, yes: HTMLButtonElement, no: HTMLButtonElement): HTMLElement {
  const box = el('section', 'banner');
  box.setAttribute('aria-label', title);
  box.style.gridTemplateColumns = '1fr';
  const body = el('div', 'banner-body');
  body.append(el('p', 'banner-title', title), el('p', undefined, text), yes, no);
  box.append(body);
  return box;
}

async function onShare(link: string): Promise<void> {
  set({ share: { status: 'idle', link } });
  const result = await copy(link);
  set({ share: { status: result, link } });
}

function onSend(link: string): void {
  try {
    void navigator.share({ title: 'Pizza dough plan', url: link }).catch(() => {});
  } catch {
    // The share sheet is optional; the link is already on screen.
  }
}

function shareSection(state: AppState): HTMLElement {
  const box = el('section', 'stack');
  box.setAttribute('aria-labelledby', 'settings-share');
  const h = el('h2', undefined, 'Share');
  h.id = 'settings-share';
  box.append(h);
  if (state.request === null) {
    box.append(el('p', 'muted', 'Choose your pizzas, day and time first, then share the plan as a link.'));
    return box;
  }
  const link = writeLink(state.request);
  box.append(button('Share this plan', 'btn btn-primary btn-block', 'share', () => void onShare(link)));
  if (share.link !== '') {
    const field = el('input', 'field-input');
    field.type = 'text';
    field.readOnly = true;
    field.value = share.link;
    field.setAttribute('aria-label', 'Share link');
    box.append(field);
    if (share.status === 'copied') box.append(el('p', undefined, 'Link copied. It carries your choices only.'));
    if (share.status === 'manual') box.append(el('p', undefined, 'Select the link and copy it by hand.'));
    if (typeof navigator.share === 'function') {
      box.append(button('Send the link', 'btn btn-secondary btn-block', 'send', () => onSend(share.link)));
    }
  }
  return box;
}

function resetSection(): HTMLElement {
  const box = el('section', 'stack');
  box.setAttribute('aria-labelledby', 'settings-saved');
  const h = el('h2', undefined, 'Saved on this device');
  h.id = 'settings-saved';
  box.append(h);

  if (confirming === 'new') {
    box.append(
      confirmBox(
        'Start a new plan?',
        'Your choices, ticked ingredients, steps and timers are cleared. Your sound and theme settings stay.',
        button('Yes, start a new plan', 'btn btn-primary', 'new-yes', () => {
          startNewPlan();
          set({ open: false, confirming: null });
        }),
        button('Keep my plan', 'btn btn-secondary', 'new-no', () => set({ confirming: null })),
      ),
    );
  } else if (confirming === 'clear') {
    box.append(
      confirmBox(
        'Clear saved data?',
        'Everything this page remembers on this device is removed, including your sound and theme settings.',
        button('Yes, clear everything', 'btn btn-primary', 'clear-yes', () => {
          clearSavedData();
          set({ open: false, confirming: null });
        }),
        button('Keep my data', 'btn btn-secondary', 'clear-no', () => set({ confirming: null })),
      ),
    );
  } else {
    box.append(
      button('Start a new plan', 'btn btn-secondary btn-block', 'new', () => set({ confirming: 'new' })),
      button('Clear saved data', 'btn btn-secondary btn-block', 'clear', () => set({ confirming: 'clear' })),
    );
  }
  return box;
}

function setTheme(theme: Theme): void {
  store.update({ preferences: { ...store.getState().preferences, theme } });
}

export function renderSettingsScreen(state: AppState): HTMLElement {
  const main = el('main', 'screen screen-settings');
  main.dataset.screen = 'settings';
  main.append(el('h1', undefined, 'Settings'));

  const prefs = el('section', 'stack');
  prefs.setAttribute('aria-labelledby', 'settings-prefs');
  const h = el('h2', undefined, 'Sound and look');
  h.id = 'settings-prefs';
  prefs.append(
    h,
    renderToggle({
      label: 'Mute sound',
      checked: state.preferences.muted,
      key: 'mute',
      onChange: (muted) => setMuted(muted),
    }),
    renderChipGroup({
      legend: 'Theme',
      name: 'theme',
      selected: state.preferences.theme,
      options: [
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ],
      onChange: (v) => setTheme(v as Theme),
    }),
  );

  main.append(shareSection(state), prefs, renderNotifyControl(state), resetSection(), button('Back', 'btn btn-secondary btn-block', 'settings-back', () => closeSettings()));
  return main;
}
