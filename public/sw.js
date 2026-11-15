// Service worker: offline after the first load (constitution VII).
// The build fills in PRECACHE (every emitted file) and the version in the cache name.
// Hashed files: stored copy first. The page and manifest: network first, stored copy when offline.
// No data leaves the device that the page would not send anyway.

const VERSION = '/*VERSION*/dev';
const CACHE = `pdp-${VERSION}`;
const PRECACHE = /*PRECACHE*/[];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith('pdp-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// A tap on a timer notification brings the app forward on that step (spec 002, FR-010).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const stepId = (event.notification.data && event.notification.data.stepId) || '';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          client.postMessage({ type: 'pdp-open', stepId });
          return client.focus();
        }
      }
      return self.clients.openWindow('./?step=' + encodeURIComponent(stepId));
    }),
  );
});

// A push from the reminder service (spec 002, US3). The message is fixed: { v, kind, stepId, title, silent }.
// If a visible page is open it already shows the alert, so nothing is shown here. The page also writes
// the wait ends it currently wants to IndexedDB; a push for an end that is no longer there (paused,
// finished early) shows nothing.
function liveEnds() {
  return new Promise((resolve) => {
    try {
      const open = indexedDB.open('pdp-live', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('kv');
      open.onerror = () => resolve(null);
      open.onsuccess = () => {
        const get = open.result.transaction('kv').objectStore('kv').get('ends');
        get.onsuccess = () => {
          open.result.close();
          resolve(Array.isArray(get.result) ? get.result : null);
        };
        get.onerror = () => resolve(null);
      };
    } catch (e) {
      resolve(null);
    }
  });
}

self.addEventListener('push', (event) => {
  let msg = null;
  try {
    msg = event.data ? event.data.json() : null;
  } catch (e) {
    msg = null;
  }
  if (!msg || msg.v !== 1 || typeof msg.stepId !== 'string') return;
  event.waitUntil(
    Promise.all([self.clients.matchAll({ type: 'window', includeUncontrolled: true }), liveEnds()]).then(([windows, live]) => {
      const visible = windows.filter((w) => w.visibilityState === 'visible');
      if (visible.length > 0) {
        for (const w of visible) w.postMessage({ type: 'pdp-timer-ended', stepId: msg.stepId });
        return undefined;
      }
      if (live !== null && !live.some((e) => e.stepId === msg.stepId)) return undefined;
      return self.registration.showNotification('Time is up', {
        body: String(msg.title || ''),
        tag: 'pdp-' + msg.stepId,
        renotify: msg.kind === 'repeat' && !msg.silent,
        silent: msg.silent === true,
        data: { stepId: msg.stepId },
      });
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const isPage = request.mode === 'navigate';
  const isManifest = new URL(request.url).pathname.endsWith('/manifest.webmanifest');
  // The page and the manifest keep the same name from build to build, so online they come from the
  // network (always the newest), and from the stored copy only when the network fails (offline).
  // Everything else has a hash in its name, which changes whenever the file does, so it is stored-first.
  if (isPage || isManifest) {
    event.respondWith(
      fetch(request).catch(() =>
        // A shared link (/?s=14&n=4...) is the same page, so pages match without the query.
        caches
          .match(request, { ignoreSearch: isPage, ignoreVary: true })
          .then((hit) => hit || (isPage ? caches.match('./', { ignoreVary: true }) : undefined))
          .then((hit) => hit || Response.error()),
      ),
    );
    return;
  }
  event.respondWith(
    // ignoreVary: the preview server sends Vary: Origin, which module scripts would otherwise miss.
    caches.match(request, { ignoreVary: true }).then((hit) => hit || fetch(request).catch(() => Response.error())),
  );
});
