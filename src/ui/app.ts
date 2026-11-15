import type { AppState, Screen, Store } from '../state/store';
import { renderPlanScreen } from './screens/plan';
import { renderScheduleScreen } from './screens/schedule';
import { renderSettingsScreen, isSettingsOpen } from './screens/settings';
import { renderStepsScreen } from './screens/steps';
import { renderMenu, renderShareChoice } from './slots/menu';
import { installAlertEffects, getActiveAlert, alertDone, alertPlusMinute, alertRemindLater } from '../state/actions/alert';
import { installNotifyEffects } from '../state/actions/notify';
import { installTimerEffects } from '../state/actions/timer';
import { renderAlertBanner } from './components/alert-banner';

type Slot = string | Node;

/** The page ends with the copyright and the build version, so you can check which build a phone has loaded. */
function versionFooter(): HTMLElement {
  const f = document.createElement('footer');
  f.className = 'app-version';
  const copy = document.createElement('p');
  copy.className = 'app-copyright';
  copy.textContent = `© ${new Date().getFullYear()} Design & Inspire Lab`;
  const build = document.createElement('p');
  build.className = 'app-build';
  build.textContent = `Version ${typeof __BUILD_INFO__ === 'string' ? __BUILD_INFO__ : 'dev'}`;
  f.append(copy, build);
  return f;
}

function append(parent: HTMLElement, slot: Slot): void {
  if (typeof slot === 'string') {
    if (slot !== '') parent.insertAdjacentHTML('beforeend', slot);
  } else {
    parent.append(slot);
  }
}

function screenShell(name: Screen, title: string): HTMLElement {
  const el = document.createElement('main');
  el.className = `screen screen-${name}`;
  el.dataset.screen = name;
  const h1 = document.createElement('h1');
  h1.textContent = title;
  el.append(h1);
  return el;
}

// Screens are stubs here. Stories replace them with src/ui/screens/*.
const screens: Record<Screen, (state: AppState) => HTMLElement> = {
  plan: renderPlanScreen,
  schedule: renderScheduleScreen,
  steps: renderStepsScreen,
};

function applyTheme(theme: AppState['preferences']['theme']): void {
  const html = document.documentElement;
  if (theme === 'system') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', theme);
}

// Moving to another screen, another step or the settings starts at the top of the page. A redraw on the
// same screen (ticking an ingredient, a timer tick) keeps the place. The first render is left alone, so a
// reload keeps the browser's own scroll position.
let lastView: string | null = null;

function startAtTopOnNewView(view: string): void {
  const changed = lastView !== null && lastView !== view;
  lastView = view;
  if (!changed) return;
  try {
    window.scrollTo(0, 0);
  } catch {
    // No scrolling in this environment.
  }
}

/** Render the current screen into root now and on every state change. */
export function mountApp(root: HTMLElement, store: Store): () => void {
  const render = (state: AppState): void => {
    applyTheme(state.preferences.theme);
    const alert = getActiveAlert(store);
    const banner =
      alert === null
        ? null
        : renderAlertBanner({
            alert,
            onDone: () => alertDone(store),
            onPlusMinute: () => alertPlusMinute(store),
            onRemindLater: () => alertRemindLater(store),
          });
    if (isSettingsOpen()) {
      root.replaceChildren(...(banner ? [banner] : []), renderSettingsScreen(state), versionFooter());
      startAtTopOnNewView('settings');
      return;
    }
    const screen = screens[state.progress.screen](state);
    // US6: the settings menu is on every screen, and a waiting shared link is asked about at the top.
    if (!screen.querySelector('[data-slot="menu"]')) append(screen, renderMenu());
    const choice = renderShareChoice();
    if (choice instanceof Node) (screen.querySelector('h1') ?? screen).after(choice);
    root.replaceChildren(...(banner ? [banner] : []), screen, versionFooter());
    startAtTopOnNewView(`${state.progress.screen}:${state.progress.currentStepId ?? ''}`);
  };
  installTimerEffects(store);
  installAlertEffects(store);
  installNotifyEffects(store);
  render(store.getState());
  return store.subscribe(render);
}
