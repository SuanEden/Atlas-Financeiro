import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerLocalServiceWorker } from './pwa/register';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento principal indisponível.');

const RemoteBootstrap=lazy(()=>import('./remote/bootstrap'));
const remoteMode=import.meta.env.VITE_ATLAS_REMOTE_MODE as string|undefined;
const integration=remoteMode!==undefined&&remoteMode!==''&&remoteMode!=='disabled';
createRoot(root).render(<StrictMode>{integration?<Suspense fallback={<main className="access-page"><h1>Atlas Financeiro</h1><p role="status">Abrindo acesso…</p></main>}><RemoteBootstrap /></Suspense>:<App />}</StrictMode>);
registerLocalServiceWorker();
