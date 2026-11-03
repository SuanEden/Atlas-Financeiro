const CACHE_NAME = 'atlas-shell-__BUILD_VERSION__';
const APP_SHELL = [/* __PRECACHE__ */];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  // Never skipWaiting: a form or transaction may be in progress in another tab.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('atlas-shell-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const target = new URL(request.url);
  if (request.method !== 'GET' || target.origin !== self.location.origin) return;
  // Authentication callbacks (including code on /), banking APIs, and
  // sensitive query-bearing navigations must always go directly to network.
  if (target.pathname === '/auth/callback' || target.pathname.startsWith('/api/')
    || target.searchParams.has('code') || target.searchParams.has('error')
    || target.searchParams.has('access_token')) return;

  if (request.mode === 'navigate') {
    // Only the actual Atlas app shell is available offline; unknown paths
    // remain normal network requests, not a cached legacy screen.
    if (target.pathname !== '/' && target.pathname !== '/index.html') return;
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) return response;
        return response;
      } catch {
        return (await caches.match('/index.html')) ?? (await caches.match('/')) ?? Response.error();
      }
    })());
    return;
  }

  if (APP_SHELL.some((asset) => asset !== '/' && target.pathname === asset)) {
    event.respondWith(caches.open(CACHE_NAME).then(async (cache) =>
      (await cache.match(request, { ignoreVary: true })) ?? fetch(request)));
  }
});
