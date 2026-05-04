// ── GROUNDWORK Service Worker ──────────────────────────────────────────
// Bump CACHE_VERSION on every deploy — must match APP_VERSION in index.html
const CACHE_VERSION = '0.9.7';
const CACHE_NAME = `groundwork-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './index.html',
  './apple-touch-icon.png',
];

// ── Install: cache core assets, do NOT skipWaiting here ───────────────
// skipWaiting only happens when user taps "Restart" (SKIP_WAITING message)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  // do NOT call self.skipWaiting() here — we want the banner to show first
});

// ── Activate: delete old caches, claim clients ────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('groundwork-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for navigation, cache-first for assets ───────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // never intercept sw.js itself — always fetch fresh
  if (url.pathname.endsWith('sw.js')) return;

  // HTML navigation — network first, fall back to cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // everything else — cache first, fall back to network
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

// ── Message: user tapped "Restart" ────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
