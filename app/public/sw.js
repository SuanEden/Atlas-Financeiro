const CACHE_NAME = 'atlas-shell-__BUILD_VERSION__';
const APP_SHELL = [/* __PRECACHE__ */];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  // Preserve open forms; the new worker activates after existing tabs close.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('atlas-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const target = new URL(event.request.url);
  if (event.request.method !== 'GET' || target.origin !== self.location.origin || target.pathname.startsWith('/api/')) return;
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    if (event.request.mode === 'navigate') {
      try {const fresh=await fetch(event.request,{cache:'no-store'});if(fresh.ok)return fresh;} catch { /* Offline fallback */ }
      return (await cache.match('/')) ?? Response.error();
    }
    // Static assets are identical regardless of Origin (Vite preview sends Vary: Origin).
    return (await cache.match(event.request, { ignoreVary: true })) ?? fetch(event.request);
  }));
});
