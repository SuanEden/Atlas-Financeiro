/**
 * Register only the current Atlas shell. Legacy I3 caches are pruned by the
 * versioned worker during activation; financial IndexedDB/localStorage remain
 * untouched. OAuth and bank endpoints are NEVER cached by this worker.
 */
export function registerLocalServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    }).then((registration) => registration.update())
      .catch(() => { /* Online finance remains usable if offline setup fails. */ });
  }, { once: true });
}
