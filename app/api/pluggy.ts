/**
 * Server-side read-only Pluggy gateway for Vercel Node Functions.
 * Requires authenticated, allowlisted Supabase owner; NEVER returns API keys.
 * Configure PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET, ATLAS_PLUGGY_OWNER_ID,
 * VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Preview.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

let cachedKey: { value: string; expires: number } | undefined;
const reply = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
};
async function key(): Promise<string> {
  if (cachedKey && cachedKey.expires > Date.now()) return cachedKey.value;
  const { PLUGGY_CLIENT_ID: clientId, PLUGGY_CLIENT_SECRET: clientSecret } = process.env;
  if (!clientId || !clientSecret) throw new Error('Pluggy credentials not configured');
  const r = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }), signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error('Pluggy authentication unavailable');
  const j = await r.json() as { apiKey?: string };
  if (!j.apiKey) throw new Error('Pluggy authentication response invalid');
  cachedKey = { value: j.apiKey, expires: Date.now() + 100 * 60 * 1000 };
  return j.apiKey;
}
async function authorize(req: IncomingMessage): Promise<boolean> {
  const owner = process.env.ATLAS_PLUGGY_OWNER_ID;
  const url = process.env.VITE_SUPABASE_URL;
  const publishable = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const match = /^Bearer (\S+)$/.exec(String(req.headers.authorization ?? ''));
  if (!owner || !url || !publishable || !match) return false;
  const u = new URL('/auth/v1/user', url);
  const r = await fetch(u, {
    headers: { Authorization: 'Bearer ' + match[1], apikey: publishable },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return false;
  const user = await r.json() as { id?: string; email_confirmed_at?: string };
  return user.id === owner && Boolean(user.email_confirmed_at);
}
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return reply(res, 405, { error: 'Method not allowed' });
  try {
    if (!await authorize(req)) return reply(res, 403, { error: 'Acesso não autorizado ou configuração incompleta.' });
    const original = new URL(req.url ?? '/', 'http://localhost');
    const resource = original.searchParams.get('resource');
    const itemId = original.searchParams.get('itemId');
    const accountId = original.searchParams.get('accountId');
    const cursor = original.searchParams.get('cursor');
    const uuid = (v: string | null) => Boolean(v && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v));
    let endpoint: URL;
    if (resource === 'accounts' && uuid(itemId) && !accountId && !cursor) {
      endpoint = new URL('https://api.pluggy.ai/accounts');
      endpoint.searchParams.set('itemId', itemId!);
    } else if (resource === 'transactions' && uuid(accountId) && !itemId) {
      endpoint = new URL('https://api.pluggy.ai/v2/transactions');
      endpoint.searchParams.set('accountId', accountId!);
      if (cursor) {
        if (!/^[\w-]{1,250}$/.test(cursor)) return reply(res, 400, { error: 'Cursor inválido.' });
        endpoint.searchParams.set('cursor', cursor);
      }
    } else return reply(res, 400, { error: 'Parâmetros inválidos.' });
    const r = await fetch(endpoint, { headers: { 'X-API-KEY': await key() }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return reply(res, 502, { error: 'Não foi possível consultar a Pluggy.', upstreamStatus: r.status });
    const body = await r.json();
    return reply(res, 200, body);
  } catch {
    return reply(res, 503, { error: 'Serviço de importação temporariamente indisponível.' });
  }
}
