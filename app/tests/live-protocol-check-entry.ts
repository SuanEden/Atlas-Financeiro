import '../src/styles.css';
import { createSupabaseAdapter, readRemoteConfig } from '../src/auth/supabase-adapter';
import { checkLiveProtocol } from './live-protocol-check';

const button = document.querySelector<HTMLButtonElement>('#check');
const output = document.querySelector<HTMLPreElement>('#result');
if (!button || !output) throw new Error('Estrutura da conferência indisponível.');
const checkButton = button, checkOutput = output;
let adapter: ReturnType<typeof createSupabaseAdapter> | undefined;

if (!import.meta.env.DEV || !['127.0.0.1', 'localhost'].includes(location.hostname)) {
  checkButton.disabled = true;
  checkOutput.textContent = 'Esta conferência está disponível apenas no ambiente local de desenvolvimento.';
} else {
  checkButton.addEventListener('click', async () => {
    checkButton.disabled = true;
    delete checkOutput.dataset.passed;
    checkOutput.textContent = 'Conferindo sua sessão e o servidor…';
    try {
      const config = readRemoteConfig(import.meta.env);
      if (!config) {
        checkOutput.textContent = 'A integração local não está configurada para esta conferência.';
        return;
      }
      // The SDK uses the existing session internally. Tokens are never read by
      // this page, rendered, logged, copied or returned to the agent.
      adapter ??= createSupabaseAdapter(config, location.origin);
      const { auth, transport } = adapter;
      const result = await checkLiveProtocol(auth, transport);
      checkOutput.textContent = [...result.checks, result.message].join('\n');
      checkOutput.dataset.passed = String(result.ok);
    } catch {
      checkOutput.textContent = 'A conferência não pôde ser concluída. Volte ao Atlas e confira sua entrada.';
    } finally {
      checkButton.disabled = false;
    }
  });
}
