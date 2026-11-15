import type { AppState, Screen, Store } from '../state/store';
import { renderPlanScreen } from './screens/plan';
import { renderScheduleScreen } from './screens/schedule';
import { renderStepsScreen } from './screens/steps';

type Slot = string | Node;

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

/** Render the current screen into root now and on every state change. */
export function mountApp(root: HTMLElement, store: Store): () => void {
  const render = (state: AppState): void => {
    applyTheme(state.preferences.theme);
    root.replaceChildren(screens[state.progress.screen](state));
  };
  render(store.getState());
  return store.subscribe(render);
}
