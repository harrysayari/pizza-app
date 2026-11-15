// Service worker: offline after the first load (constitution VII).
// The build fills in PRECACHE (every emitted file) and the version in the cache name.
// Cache first, then the network. No data leaves the device that the page would not send anyway.

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

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const isPage = request.mode === 'navigate';
  event.respondWith(
    // A shared link (/?s=14&n=4...) is the same page, so pages match without the query.
    // ignoreVary: the preview server sends Vary: Origin, which module scripts would otherwise miss.
    caches.match(request, { ignoreSearch: isPage, ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(request).catch(() => (isPage ? caches.match('/', { ignoreVary: true }) : Response.error())),
    ),
  );
});
