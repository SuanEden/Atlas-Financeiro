import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { registerLocalServiceWorker } from './pwa/register';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento principal indisponível.');

const CLOUD_INTENT = 'atlas-financeiro:cloud-auth-intent';
const url = new URL(location.href);
const callback = url.pathname === '/auth/callback' || (url.pathname === '/' && (url.searchParams.has('code') || url.searchParams.has('error')));
const explicitCloud = url.pathname === '/' && url.searchParams.get('cloud') === '1';
// OAuth redirectTo must stay at the allowlisted /auth/callback. The tab-scoped
// marker routes only this tab's callback back to the explicitly chosen mode.
const cloud = explicitCloud || (callback && sessionStorage.getItem(CLOUD_INTENT) === '1');
if (cloud) {
  if (callback) sessionStorage.removeItem(CLOUD_INTENT);
  else sessionStorage.setItem(CLOUD_INTENT, '1');
} else {
  sessionStorage.removeItem(CLOUD_INTENT);
}

// Default production never migrates or writes local financial data remotely.
// Cloud mode is an explicit, separately namespaced opt-in with gated writes.
const Workspace = cloud
  ? lazy(() => import('./remote/bootstrap'))
  : lazy(() => import('./remote/LocalBankWorkspace'));
createRoot(root).render(
  <StrictMode><Suspense fallback={<main className="access-page"><h1>Atlas Financeiro</h1><p>Carregando seu ambiente…</p></main>}><Workspace /></Suspense></StrictMode>,
);
registerLocalServiceWorker();
