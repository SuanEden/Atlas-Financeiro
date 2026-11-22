#!/usr/bin/env node
/**
 * Deployment configuration preflight. No network calls or financial-data access.
 * Target: local (default), staging, production.
 * Never prints credentials or user-specific account information.
 */
const target = process.argv.find(arg => arg.startsWith('--target='))?.slice('--target='.length) ?? 'local';
const errors = [];
const fail = message => errors.push(message);
const url = process.env.VITE_SUPABASE_URL?.trim() ?? '';
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
const authOrigin = process.env.VITE_ATLAS_AUTH_ORIGIN?.trim() ?? '';
const remoteMode = process.env.VITE_ATLAS_REMOTE_MODE?.trim() ?? 'disabled';
const projects = {
  staging: 'eiqsrredrboxxhxwibyy',
  production: 'zxancpaardzuqyyikwio',
};

if (!['local', 'staging', 'production'].includes(target)) fail('Destino inválido. Use local, staging ou production.');
if (target === 'local') {
  if (remoteMode !== 'disabled') fail('O modo local deve usar VITE_ATLAS_REMOTE_MODE=disabled.');
} else {
  if (remoteMode !== 'integration') fail('A integração requer VITE_ATLAS_REMOTE_MODE=integration.');
  if (!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key)) fail('Configure uma chave publicável Supabase válida; não use credenciais secretas.');
  try {
    const parsed = new URL(url);
    const expected = projects[target];
    if (parsed.protocol !== 'https:' || parsed.hostname !== `${expected}.supabase.co` ||
        parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password || parsed.port)
      fail('O Supabase configurado não corresponde ao projeto aprovado para o destino.');
  } catch { fail('Configure a URL HTTPS do Supabase aprovado.'); }
  try {
    const parsed = new URL(authOrigin);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.pathname !== '/' ||
        parsed.username || parsed.password || parsed.search || parsed.hash || parsed.port)
      fail('Configure VITE_ATLAS_AUTH_ORIGIN com a origem HTTPS do domínio autorizado.');
  } catch { fail('Configure VITE_ATLAS_AUTH_ORIGIN com o domínio HTTPS autorizado.'); }
  if (target === 'production' && process.env.ATLAS_RELEASE_APPROVED !== 'yes')
    fail('Publicação financeira exige aprovação explícita ATLAS_RELEASE_APPROVED=yes.');
}

if (errors.length) {
  for (const error of errors) console.error(`ERRO preflight: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Atlas preflight: configuração ${target} aprovada. Dados e credenciais não foram acessados.`);
}
