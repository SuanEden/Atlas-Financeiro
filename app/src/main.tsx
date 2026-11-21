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
const explicitLocal = url.pathname === '/' && url.searchParams.get('local') === '1';
const cloudConfigured = import.meta.env.VITE_ATLAS_REMOTE_MODE === 'integration'
  || Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
const test = url.pathname === '/' && url.searchParams.get('test') === '1';
const cloud = !test && !explicitLocal && (callback
  ? sessionStorage.getItem(CLOUD_INTENT) === '1'
  : explicitCloud || (url.pathname === '/' && cloudConfigured));
if (cloud) {
  if (callback) sessionStorage.removeItem(CLOUD_INTENT);
  else sessionStorage.setItem(CLOUD_INTENT, '1');
} else {
  sessionStorage.removeItem(CLOUD_INTENT);
}

// Opening the cloud workspace does not associate or migrate the separate local base.
const Workspace = test
  ? lazy(() => import('./remote/TestWorkspace'))
  : cloud ? lazy(() => import('./remote/bootstrap'))
  : lazy(() => import('./remote/LocalBankWorkspace'));
createRoot(root).render(
  <StrictMode><Suspense fallback={<main className="access-page"><h1>Atlas Financeiro</h1><p>Carregando seu ambiente…</p></main>}><Workspace /></Suspense></StrictMode>,
);
registerLocalServiceWorker();
