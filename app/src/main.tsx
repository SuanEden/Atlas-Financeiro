import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { registerLocalServiceWorker } from './pwa/register';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento principal indisponível.');

createRoot(root).render(<StrictMode><App /></StrictMode>);
registerLocalServiceWorker();
