/** Remove legacy app-shell workers that can serve obsolete I3 screens.
 * Does not touch IndexedDB, localStorage, or financial backups.
 * Offline shell is temporarily disabled while authentication routing stabilizes.
 */
export function registerLocalServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const owned = registrations.filter(r => r.scope === new URL('/', location.origin).href);
      await Promise.all(owned.map(r => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.startsWith('atlas-shell-')).map(k => caches.delete(k)));
      }
      // Refresh once if this page was actually controlled by an obsolete worker.
      if (navigator.serviceWorker.controller && sessionStorage.getItem('atlas:pwa-reset:v1') !== 'done') {
        sessionStorage.setItem('atlas:pwa-reset:v1', 'done');
        location.reload();
      }
    })().catch(() => { /* The financial store is untouched. */ });
  }, { once: true });
}
