export function registerLocalServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is progressive; financial data remains in IndexedDB.
    });
  }, { once: true });
}
