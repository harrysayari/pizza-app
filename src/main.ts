import '@fontsource-variable/fraunces';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '../design/tokens.css';
import '../design/components.css';
import './styles/app.css';

import { askForNotificationsOnLoad } from './state/actions/notify';
import { hydrate } from './state/hydrate';
import { store } from './state/store';
import { mountApp } from './ui/app';

// US6: restore what the device remembers (and any shared link) before the first render.
hydrate(store);

const root = document.getElementById('app');
if (root) mountApp(root, store);
askForNotificationsOnLoad(store);

// Offline after first load: the service worker is registered in production builds only.
try {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
} catch {
  // Without a service worker the page still works online.
}
