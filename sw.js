// ── GROUNDWORK Service Worker ──────────────────────────────────────────
// Bump CACHE_VERSION whenever you deploy a new build.
// This must match APP_VERSION in index.html.
const CACHE_VERSION = '0.9.2';
const CACHE_NAME = `groundwork-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './apple-touch-icon.png',
];

// ── Install: cache core assets ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  // activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── Activate: delete old caches ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('groundwork-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // take control of all open clients immediately
  self.clients.claim();
});

// ── Fetch: network-first for HTML, cache-first for assets ──────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // for HTML (the app shell) — network first, fall back to cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // update cache with fresh copy
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // for everything else — cache first, fall back to network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});

// ── Message: force update on demand ────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
