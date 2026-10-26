const CACHE_NAME = 'atlas-shell-__BUILD_VERSION__';
const APP_SHELL = [/* __PRECACHE__ */];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  // Wait for all existing tabs to close; never force a form reload.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('atlas-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    if (event.request.mode === 'navigate') return (await cache.match('/')) ?? fetch(event.request);
    // Static assets are identical regardless of Origin (Vite preview sends Vary: Origin).
    return (await cache.match(event.request, { ignoreVary: true })) ?? fetch(event.request);
  }));
});
