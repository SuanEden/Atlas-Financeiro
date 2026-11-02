import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { registerLocalServiceWorker } from './pwa/register';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento principal indisponível.');

// The financial workspace stays local. Bank connections have a separate auth flow.
// Never route production through the legacy I3 AccessGate.
const LocalBankWorkspace = lazy(() => import('./remote/LocalBankWorkspace'));
createRoot(root).render(<StrictMode><Suspense fallback={<main className="access-page"><h1>Atlas Financeiro</h1><p>Carregando seus dados locais…</p></main>}><LocalBankWorkspace /></Suspense></StrictMode>);
registerLocalServiceWorker();
