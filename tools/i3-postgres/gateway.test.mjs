import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { once } from 'node:events';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { join } from 'node:path';
import { startSyntheticCluster, freeLoopbackPort } from './postgres-cluster.mjs';
import { preparePostgrest, localProcessEnvironment } from './setup-postgrest.mjs';

let cluster, admin, gateway, origin, secret;
function jwt(userId, claims = {}, key = secret) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = [encode({ alg: 'HS256', typ: 'JWT' }), encode({ role: 'authenticated', sub: userId,
    aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 600, ...claims })].join('.');
  return unsigned + '.' + createHmac('sha256', key).update(unsigned).digest('base64url');
}
async function user(active = true) {
  const id = randomUUID();
  await admin.query('insert into auth.users values($1)', [id]);
  if (active !== null) await admin.query('insert into atlas_security.app_access values($1,$2)', [id, active]);
  return id;
}
async function request(path, { token, body, profile = 'api', method = 'POST' } = {}) {
  assert.ok(origin.startsWith('http://127.0.0.1:'));
  assert.ok(path.startsWith('/') && !path.includes('://'));
  const headers = { [method === 'GET' ? 'Accept-Profile' : 'Content-Profile']: profile };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (method !== 'GET') headers['Content-Type'] = 'application/json';
  const r = await fetch(origin + path, { method, headers, ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }), signal: AbortSignal.timeout(10_000) });
  const data = await r.json();
  return { status: r.status, data };
}
const rpc = (name, token, body) => request('/rpc/' + name, { token, body });
function account(userId, name = 'Conta sintetica HTTP') {
  const operationId = randomUUID();
  return { protocolVersion: 1, operationId, userId, baseRevision: '0', kind: 'create_account', operation: {
    id: operationId, userId, kind: 'create_account', createdAt: '2026-10-27T12:00:00.000Z',
    payload: { schemaVersion: 1, userId, accounts: [{ id: randomUUID(), userId, name, kind: 'cash', availability: 'free' }] } } };
}
async function withWrites(work) {
  await admin.query('update atlas_security.integration_control set writes_enabled=true');
  try { return await work(); }
  finally { await admin.query('update atlas_security.integration_control set writes_enabled=false'); }
}
async function counts(id) {
  return (await admin.query(`select
    (select count(*)::int from atlas_private.accounts where user_id=$1) as accounts,
    (select count(*)::int from atlas_private.financial_events where user_id=$1) as events,
    (select count(*)::int from atlas_private.settlements where user_id=$1) as settlements,
    (select count(*)::int from atlas_private.postings where user_id=$1) as postings,
    (select count(*)::int from atlas_private.operation_receipts where user_id=$1) as receipts,
    (select revision::text from atlas_private.sync_heads where user_id=$1) as head`, [id])).rows[0];
}

before(async () => {
  const binary = await preparePostgrest();
  cluster = await startSyntheticCluster(); admin = cluster.admin;
  await admin.query('create role authenticator login noinherit nocreatedb nocreaterole nosuperuser; grant anon,authenticated to authenticator;');
  secret = randomBytes(32).toString('hex');
  const port = await freeLoopbackPort(); origin = 'http://127.0.0.1:' + port;
  gateway = spawn(binary, [], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], env: {
    ...localProcessEnvironment(), PGRST_DB_URI: `postgresql://authenticator@127.0.0.1:${cluster.port}/postgres`,
    PGRST_DB_SCHEMAS: 'api', PGRST_DB_ANON_ROLE: 'anon', PGRST_DB_POOL: '5', PGRST_DB_CONFIG: 'false',
    PGRST_DB_CHANNEL_ENABLED: 'false', PGRST_JWT_SECRET: secret, PGRST_JWT_AUD: 'authenticated',
    PGRST_SERVER_HOST: '127.0.0.1', PGRST_SERVER_PORT: String(port), PGRST_LOG_LEVEL: 'error',
  } });
  let spawnError;
  gateway.on('error', () => { spawnError = true; });
  gateway.stderr.on('data', bytes => appendFileSync(join(cluster.root, 'gateway.log'), bytes));
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (spawnError || gateway.exitCode !== null) throw new Error('Local gateway failed to start; temporary diagnostics retained');
    try { const response = await rpc('i3_readiness'); if (response.status === 401 && response.data.code === '42501') return; }
    catch { /* the process may still be binding its local port */ }
    await delay(50);
  }
  throw new Error('Local gateway readiness timed out');
}, { timeout: 60_000 });

after(async () => {
  try {
    if (gateway && gateway.exitCode === null && gateway.signalCode === null) {
      const exit = once(gateway, 'exit'); gateway.kill();
      await Promise.race([exit, delay(5000).then(() => { throw new Error('Owned gateway did not stop'); })]);
    }
  } finally { secret = undefined; await cluster?.stop(); }
});

test('gateway authenticator has no inheritance, superuser or RLS bypass', async () => {
  const role = (await admin.query("select rolcanlogin,rolinherit,rolsuper,rolbypassrls from pg_roles where rolname='authenticator'")).rows[0];
  assert.deepEqual(role, { rolcanlogin: true, rolinherit: false, rolsuper: false, rolbypassrls: false });
  assert.equal((await admin.query('select writes_enabled from atlas_security.integration_control')).rows[0].writes_enabled, false);
});

test('signed owner reads readiness and empty pull while a valid financial command is blocked', async () => {
  const id = await user(), token = jwt(id);
  assert.deepEqual(await rpc('i3_readiness', token), { status: 200, data: { protocolVersion: 1, financialWritesEnabled: false, localProtocolAvailable: true } });
  const page = await rpc('i3_pull', token, { p_after: '0' });
  assert.equal(page.status, 200); assert.equal(page.data.userId, id); assert.deepEqual(page.data.batches, []);
  const denial = await rpc('i3_apply', token, { p_envelope: account(id) });
  assert.equal(denial.status, 403); assert.equal(denial.data.code, '42501'); assert.equal(denial.data.message, 'REMOTE_WRITES_DISABLED');
  assert.deepEqual(await counts(id), { accounts: 0, events: 0, settlements: 0, postings: 0, receipts: 0, head: null });
});

test('all RPCs refuse anonymous HTTP requests', async () => {
  for (const name of ['i3_readiness', 'i3_pull', 'i3_apply']) {
    const response = await rpc(name, undefined, name === 'i3_pull' ? { p_after: '0' } : name === 'i3_apply' ? { p_envelope: {} } : {});
    assert.equal(response.status, 401); assert.equal(response.data.code, '42501');
  }
});

test('forged, expired, wrong-audience and future tokens are cryptographically rejected', async () => {
  const id = await user();
  const invalid = [jwt(id, {}, randomBytes(32).toString('hex')), jwt(id, { exp: Math.floor(Date.now() / 1000) - 120 }),
    jwt(id, { aud: 'another-application' }), jwt(id, { nbf: Math.floor(Date.now() / 1000) + 600 })];
  assert.equal((await rpc('i3_readiness', jwt(id))).status, 200);
  for (const token of invalid) assert.equal((await rpc('i3_readiness', token)).status, 401);
});

test('signed registered user without active authorization cannot call any financial RPC', async () => {
  for (const active of [null, false]) {
    const id = await user(active), token = jwt(id);
    for (const [name, body] of [['i3_readiness', {}], ['i3_pull', { p_after: '0' }], ['i3_apply', { p_envelope: account(id) }]]) {
      const response = await rpc(name, token, body); assert.equal(response.status, 403); assert.equal(response.data.message, 'Access denied');
    }
    assert.equal((await counts(id)).accounts, 0);
  }
});

test('missing subject and an ungranted privileged role cannot obtain API access', async () => {
  const id = await user();
  assert.equal((await rpc('i3_readiness', jwt(undefined))).status, 403);
  const escalation = await rpc('i3_readiness', jwt(id, { role: 'postgres' }));
  assert.equal(escalation.status, 403); assert.equal(escalation.data.code, '42501');
  assert.equal((await counts(id)).accounts, 0);
});

test('authorization revocation blocks the same still-valid signed token immediately', async () => {
  const id = await user(), token = jwt(id);
  assert.equal((await rpc('i3_readiness', token)).status, 200);
  await admin.query('update atlas_security.app_access set active=false where user_id=$1', [id]);
  try {
    for (const [name, body] of [['i3_readiness', {}], ['i3_pull', { p_after: '0' }], ['i3_apply', { p_envelope: account(id) }]]) {
      assert.equal((await rpc(name, token, body)).status, 403);
    }
  } finally { await admin.query('update atlas_security.app_access set active=true where user_id=$1', [id]); }
  assert.equal((await rpc('i3_readiness', token)).status, 200);
});

test('private/public/GraphQL profiles and generic SQL paths cannot expose tables or helpers', async () => {
  const token = jwt(await user());
  for (const profile of ['atlas_private', 'atlas_security', 'public', 'graphql_public']) {
    const response = await request('/accounts?select=id&limit=1', { token, profile, method: 'GET' });
    assert.equal(response.status, 406); assert.equal(response.data.code, 'PGRST106');
  }
  assert.equal((await request('/accounts', { token, profile: 'atlas_private', body: {} })).status, 406);
  assert.equal((await request('/rpc/insert_data', { token, profile: 'atlas_private', body: {} })).status, 406);
  assert.equal((await request('/accounts', { token, method: 'GET' })).status, 404);
  assert.equal((await rpc('exec_sql', token, { sql: 'select 1' })).status, 404);
});

test('HTTP write commits atomically, replay returns the receipt and divergence is rejected', async () => {
  const id = await user(), token = jwt(id), value = account(id);
  await withWrites(async () => {
    const first = await rpc('i3_apply', token, { p_envelope: value });
    assert.equal(first.status, 200); assert.equal(first.data.revision, '1');
    assert.deepEqual(await rpc('i3_apply', token, { p_envelope: value }), first);
    const changed = structuredClone(value); changed.operation.payload.accounts[0].name = 'Conteudo alterado';
    const conflict = await rpc('i3_apply', token, { p_envelope: changed });
    assert.equal(conflict.status, 400); assert.equal(conflict.data.code, '22023');
    const page = await rpc('i3_pull', token, { p_after: '0' });
    assert.equal(page.status, 200); assert.equal(page.data.cursor, '1'); assert.equal(page.data.batches.length, 1);
    assert.deepEqual(await counts(id), { accounts: 1, events: 0, settlements: 0, postings: 0, receipts: 1, head: '1' });
  });
});

test('a signed owner never reads another owner feed or writes a forged owner envelope', async () => {
  const first = await user(), second = await user(), firstToken = jwt(first), secondToken = jwt(second);
  await withWrites(async () => {
    assert.equal((await rpc('i3_apply', firstToken, { p_envelope: account(first) })).status, 200);
    const isolated = await rpc('i3_pull', secondToken, { p_after: '0' });
    assert.equal(isolated.status, 200); assert.deepEqual(isolated.data.batches, []); assert.equal(isolated.data.userId, second);
    const cross = await rpc('i3_apply', firstToken, { p_envelope: account(second) });
    assert.equal(cross.status, 400); assert.equal(cross.data.code, '22023');
    assert.equal((await counts(second)).accounts, 0);
  });
});

test('concurrent HTTP appends return unique ordered revisions without duplicate receipts', async () => {
  const id = await user(), token = jwt(id);
  await withWrites(async () => {
    const replies = await Promise.all([account(id), account(id)].map(value => rpc('i3_apply', token, { p_envelope: value })));
    assert.ok(replies.every(r => r.status === 200));
    assert.deepEqual(replies.map(r => r.data.revision).sort(), ['1', '2']);
    assert.deepEqual((await rpc('i3_pull', token, { p_after: '0' })).data.batches.map(r => r.revision), ['1', '2']);
    assert.equal((await counts(id)).receipts, 2);
  });
});

test('HTTP deferred failure leaves no half transfer, receipt or revision gap', async () => {
  const id = await user(), token = jwt(id), from = account(id), to = account(id), eventId = randomUUID(), settlementId = randomUUID(), operationId = randomUUID();
  await withWrites(async () => {
    await rpc('i3_apply', token, { p_envelope: from }); await rpc('i3_apply', token, { p_envelope: to });
    const value = { protocolVersion: 1, operationId, userId: id, baseRevision: '2', kind: 'record_event', operation: {
      id: operationId, userId: id, kind: 'record_event', createdAt: '2026-10-27T12:00:00.000Z', payload: {
        schemaVersion: 1, userId: id, events: [{ id: eventId, userId: id, kind: 'transfer', status: 'confirmed', certainty: 'confirmed', source: 'manual',
          amountCents: '100', accountId: from.operation.payload.accounts[0].id, transferAccountId: to.operation.payload.accounts[0].id, description: 'Transferencia sintetica incompleta', competenceDate: '2026-10-27' }],
        settlements: [{ id: settlementId, userId: id, eventId, amountCents: '100', paymentDate: '2026-10-27', settlementDate: '2026-10-27' }],
        postings: [{ id: randomUUID(), userId: id, settlementId, accountId: from.operation.payload.accounts[0].id, amountCents: '-100' }],
      } } };
    const failed = await rpc('i3_apply', token, { p_envelope: value }); assert.equal(failed.status, 400); assert.equal(failed.data.code, '23514');
    assert.deepEqual(await counts(id), { accounts: 2, events: 0, settlements: 0, postings: 0, receipts: 2, head: '2' });
    assert.equal((await rpc('i3_apply', token, { p_envelope: account(id) })).data.revision, '3');
  });
});

test('revocation during a gateway lock wait refuses the queued signed command', async () => {
  const id = await user(), token = jwt(id), holder = await cluster.connect(id);
  try {
    await withWrites(async () => {
      await rpc('i3_apply', token, { p_envelope: account(id) });
      await holder.query('begin'); await holder.query('select api.i3_apply($1::jsonb)', [JSON.stringify(account(id))]);
      const queued = rpc('i3_apply', token, { p_envelope: account(id) }).then(result => ({ result }), error => ({ error }));
      const deadline = Date.now() + 5000; let waiting = false;
      while (Date.now() < deadline) {
        waiting = (await admin.query('select exists(select 1 from pg_stat_activity where $1::int=any(pg_blocking_pids(pid))) as waiting', [holder.processID])).rows[0].waiting;
        if (waiting) break;
        await delay(10);
      }
      assert.equal(waiting, true);
      await admin.query('update atlas_security.app_access set active=false where user_id=$1', [id]);
      await holder.query('rollback'); const response = await queued;
      if (response.error) throw response.error;
      assert.equal(response.result.status, 403); assert.equal(response.result.data.code, '42501');
      assert.deepEqual(await counts(id), { accounts: 1, events: 0, settlements: 0, postings: 0, receipts: 1, head: '1' });
    });
  } finally { await holder.query('rollback'); await cluster.close(holder); }
});
