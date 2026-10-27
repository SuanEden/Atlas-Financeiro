import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import { initdb, pg_ctl } from '@embedded-postgres/windows-x64';

// Deliberately no DATABASE_URL/env override: this suite can only reach its own
// synthetic loopback cluster. No hosted Auth, signed JWT, real account or OS service.
let root, dataDir, port, admin, started = false;
const connections = new Set();
// PostgreSQL inherits native handles on Windows. Do not wait for a pipe held by
// its background process after pg_ctl exits; diagnostics go to postgres.log.
const run = (binary, args) => execFileSync(binary, args, { stdio: 'ignore', windowsHide: true, timeout: 30_000 });
async function connect(owner) {
  const client = new Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres', ssl: false,
    connectionTimeoutMillis: 3000, statement_timeout: 10_000, application_name: 'atlas-i3-synthetic-concurrency' });
  await client.connect(); connections.add(client);
  if (owner) {
    await client.query('set role authenticated');
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  }
  return client;
}
async function close(client) { connections.delete(client); await client.end(); }
async function pair(owner, work) {
  const a = await connect(owner), b = await connect(owner);
  try { return await work(a, b); }
  finally {
    await Promise.allSettled([a.query('rollback'), b.query('rollback')]);
    await Promise.allSettled([close(a), close(b)]);
  }
}
async function owner() {
  const id = randomUUID();
  await admin.query('insert into auth.users values($1)', [id]);
  await admin.query('insert into atlas_security.app_access values($1,true)', [id]);
  return id;
}
function envelope(userId, kind, data, baseRevision = '0') {
  const operationId = randomUUID();
  return { protocolVersion: 1, operationId, userId, baseRevision, kind,
    operation: { id: operationId, userId, kind, createdAt: '2026-10-27T12:00:00.000Z', payload: { schemaVersion: 1, userId, ...data } } };
}
function account(userId, name = 'Conta sintetica') {
  return envelope(userId, 'create_account', { accounts: [{ id: randomUUID(), userId, name, kind: 'cash', availability: 'free' }] });
}
function event(userId, accountId, { destination, reverse, partial = false, base = '0' } = {}) {
  const row = { id: randomUUID(), userId, kind: destination ? 'transfer' : 'expense', status: 'confirmed', certainty: 'confirmed',
    source: 'manual', amountCents: '100', accountId, description: 'Movimento sintetico', competenceDate: '2026-10-27',
    ...(destination ? { transferAccountId: destination } : {}), ...(reverse ? { reversesEventId: reverse } : {}) };
  const settlement = { id: randomUUID(), userId, eventId: row.id, amountCents: '100', paymentDate: '2026-10-27', settlementDate: '2026-10-27' };
  const postings = [{ id: randomUUID(), userId, settlementId: settlement.id, accountId, amountCents: reverse ? '100' : '-100' }];
  if (destination && !partial) postings.push({ id: randomUUID(), userId, settlementId: settlement.id, accountId: destination, amountCents: '100' });
  return envelope(userId, reverse ? 'reverse_event' : 'record_event', { events: [row], settlements: [settlement], postings }, base);
}
const apply = async (client, value) => (await client.query('select api.i3_apply($1::jsonb) as result', [JSON.stringify(value)])).rows[0].result;
const pull = async (client, after = '0', through = null, limit = 20) => (await client.query('select api.i3_pull($1,$2,$3) as result', [after, through, limit])).rows[0].result;
async function blocked(waiter, holder) {
  const limit = Date.now() + 5000;
  while (Date.now() < limit) {
    const { rows } = await admin.query('select $2::int=any(pg_blocking_pids($1::int)) as blocked', [waiter.processID, holder.processID]);
    if (rows[0].blocked) return;
    await delay(10);
  }
  assert.fail('Expected a real lock wait between independent PostgreSQL backends');
}
function pending(client, value) {
  // Attach handlers immediately so a failed query never becomes an unhandled rejection.
  return apply(client, value).then(result => ({ result }), error => ({ error }));
}
async function accepted(promise) { const r = await promise; if (r.error) throw r.error; return r.result; }
async function counts(id) {
  const { rows } = await admin.query(`select
    (select count(*)::int from atlas_private.accounts where user_id=$1) as accounts,
    (select count(*)::int from atlas_private.financial_events where user_id=$1) as events,
    (select count(*)::int from atlas_private.settlements where user_id=$1) as settlements,
    (select count(*)::int from atlas_private.postings where user_id=$1) as postings,
    (select count(*)::int from atlas_private.operation_receipts where user_id=$1) as receipts,
    (select revision::text from atlas_private.sync_heads where user_id=$1) as head`, [id]);
  return rows[0];
}

before(async () => {
  assert.equal(process.platform, 'win32');
  root = await mkdtemp(join(tmpdir(), 'atlas-i3-pg-'));
  dataDir = join(root, 'data');
  const socket = createServer();
  await new Promise((resolve, reject) => socket.once('error', reject).listen(0, '127.0.0.1', resolve));
  port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  // Trust authentication is confined to this short-lived synthetic loopback cluster.
  run(initdb, ['-D', dataDir, '--username=postgres', '--auth=trust', '--encoding=UTF8', '--locale=C']);
  started = true;
  run(pg_ctl, ['start', '-D', dataDir, '-l', join(root, 'postgres.log'), '-w', '-t', '20', '-o', `-h 127.0.0.1 -p ${port} -c max_connections=15`]);
  admin = await connect();
  const version = (await admin.query("select current_setting('server_version_num')::int as version")).rows[0].version;
  assert.ok(version >= 170000 && version < 180000);
  await admin.query(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const name of ['20261026164923_i3_private_foundation.sql', '20261026171659_i3_transaction_protocol.sql']) {
    await admin.query(await readFile(new URL('../../supabase/migrations/' + name, import.meta.url), 'utf8'));
  }
  assert.equal((await admin.query('select writes_enabled from atlas_security.integration_control')).rows[0].writes_enabled, false);
  // The only write switch change is in this disposable local synthetic cluster.
  await admin.query('update atlas_security.integration_control set writes_enabled=true');
}, { timeout: 60_000 });

after(async () => {
  for (const client of connections) { try { await client.end(); } catch { /* process stop remains mandatory */ } }
  connections.clear();
  if (started) run(pg_ctl, ['stop', '-D', dataDir, '-m', 'immediate', '-w', '-t', '20']);
  // Keep temporary diagnostics/data outside Git; never recursively delete computed paths.
});

test('database switch remains administrative and disabled rejects all financial work', async () => {
  const id = await owner();
  await admin.query('update atlas_security.integration_control set writes_enabled=false');
  try {
    await pair(id, async (a) => {
      await assert.rejects(apply(a, account(id)), e => e.code === '42501' && /REMOTE_WRITES_DISABLED/.test(e.message));
      assert.deepEqual(await counts(id), { accounts: 0, events: 0, settlements: 0, postings: 0, receipts: 0, head: null });
      await assert.rejects(a.query('update atlas_security.integration_control set writes_enabled=true'), e => e.code === '42501');
    });
  } finally { await admin.query('update atlas_security.integration_control set writes_enabled=true'); }
});

test('first concurrent bootstrap waits for commit and returns exactly the same receipt', async () => {
  const id = await owner(), source = randomUUID();
  const value = { protocolVersion: 1, operationId: randomUUID(), userId: id, baseRevision: '0', kind: 'bootstrap',
    source: { ownerId: source, digest: 'a'.repeat(64) }, coveredOperations: [],
    data: { schemaVersion: 2, userId: id, accounts: account(id).operation.payload.accounts, categories: [], events: [], settlements: [], postings: [] } };
  await pair(id, async (a, b) => {
    assert.notEqual(a.processID, b.processID);
    await a.query('begin'); const first = await apply(a, value);
    const retry = pending(b, value); await blocked(b, a);
    await a.query('commit'); assert.deepEqual(await accepted(retry), first);
    assert.deepEqual(await counts(id), { accounts: 1, events: 0, settlements: 0, postings: 0, receipts: 1, head: '1' });
  });
});

test('concurrent independent appends serialize revisions; uncommitted batches stay invisible', async () => {
  const id = await owner();
  await pair(id, async (a, b) => {
    const reader = await connect(id);
    try {
      await a.query('begin'); assert.equal((await apply(a, account(id))).revision, '1');
      const second = pending(b, account(id)); await blocked(b, a);
      assert.deepEqual((await pull(reader)).batches, []);
      await a.query('commit'); assert.equal((await accepted(second)).revision, '2');
      assert.deepEqual((await pull(reader)).batches.map(r => r.revision), ['1', '2']);
    } finally { await close(reader); }
  });
});

test('rolled-back first writer leaves no revision gap and never leaks its batch', async () => {
  const id = await owner(), discarded = account(id), kept = account(id);
  await pair(id, async (a, b) => {
    await a.query('begin'); await apply(a, discarded);
    const second = pending(b, kept); await blocked(b, a);
    await a.query('rollback'); assert.equal((await accepted(second)).revision, '1');
    const page = await pull(b);
    assert.deepEqual(page.batches.map(r => r.envelope.operationId), [kept.operationId]);
    assert.equal(page.cursor, '1'); assert.equal((await counts(id)).accounts, 1);
  });
});

test('lost response replay across another connection is idempotent; divergent replay is rejected', async () => {
  const id = await owner(), value = account(id);
  await pair(id, async (a, b) => {
    const first = await apply(a, value); assert.deepEqual(await apply(b, value), first);
    const changed = structuredClone(value); changed.operation.payload.accounts[0].name = 'Conteudo divergente';
    await assert.rejects(apply(b, changed), e => e.code === '22023' && /ID_CONTENT_MISMATCH/.test(e.message));
    assert.equal((await counts(id)).receipts, 1);
  });
});

test('a different owner progresses while another owner holds a transaction open', async () => {
  const first = await owner(), second = await owner();
  const a = await connect(first), b = await connect(second);
  try {
    await a.query('begin'); await apply(a, account(first));
    await b.query("set statement_timeout='2s'");
    assert.equal((await apply(b, account(second))).revision, '1');
    assert.equal((await admin.query("select state from pg_stat_activity where pid=$1", [a.processID])).rows[0].state, 'idle in transaction');
    await a.query('rollback');
  } finally { await Promise.allSettled([a.query('rollback'), b.query('rollback')]); await Promise.allSettled([close(a), close(b)]); }
});

test('concurrent reversals commit one aggregate and reject the other without partial data', async () => {
  const id = await owner();
  await pair(id, async (a, b) => {
    const seed = account(id); await apply(a, seed);
    const original = event(id, seed.operation.payload.accounts[0].id, { base: '1' }); await apply(a, original);
    const args = { reverse: original.operation.payload.events[0].id, base: '2' };
    await a.query('begin'); assert.equal((await apply(a, event(id, seed.operation.payload.accounts[0].id, args))).revision, '3');
    const rival = pending(b, event(id, seed.operation.payload.accounts[0].id, args)); await blocked(b, a);
    await a.query('commit'); const rejected = await rival;
    assert.equal(rejected.error?.code, '23505');
    assert.deepEqual(await counts(id), { accounts: 1, events: 2, settlements: 2, postings: 2, receipts: 3, head: '3' });
    assert.equal((await apply(b, account(id))).revision, '4');
  });
});

test('deferred half-transfer failure rolls back commit and releases the waiting writer', async () => {
  const id = await owner();
  await pair(id, async (a, b) => {
    const from = account(id), to = account(id); await apply(a, from); await apply(a, to);
    await a.query('begin');
    await apply(a, event(id, from.operation.payload.accounts[0].id, { destination: to.operation.payload.accounts[0].id, partial: true, base: '2' }));
    const second = pending(b, account(id)); await blocked(b, a);
    await assert.rejects(a.query('commit'), e => e.code === '23514' && /postings/.test(e.message));
    assert.equal((await accepted(second)).revision, '3');
    assert.deepEqual(await counts(id), { accounts: 3, events: 0, settlements: 0, postings: 0, receipts: 3, head: '3' });
    assert.deepEqual((await pull(b)).batches.map(r => r.revision), ['1', '2', '3']);
  });
});

test('fixed pull upper bound excludes a later committed revision on another connection', async () => {
  const id = await owner();
  await pair(id, async (a, b) => {
    await apply(a, account(id)); await apply(a, account(id));
    const first = await pull(b, '0', null, 1); assert.equal(first.through, '2'); assert.equal(first.cursor, '1');
    await apply(a, account(id));
    const rest = await pull(b, first.cursor, first.through);
    assert.deepEqual(rest.batches.map(r => r.revision), ['2']);
    assert.deepEqual((await pull(b, rest.cursor)).batches.map(r => r.revision), ['3']);
  });
});

test('revocation while waiting for an owner lock prevents the queued financial command', async () => {
  const id = await owner();
  await pair(id, async (a, b) => {
    await apply(a, account(id));
    await a.query('begin'); await apply(a, account(id));
    const queued = pending(b, account(id)); await blocked(b, a);
    await admin.query('update atlas_security.app_access set active=false where user_id=$1', [id]);
    await a.query('rollback'); const denied = await queued;
    assert.equal(denied.error?.code, '42501');
    assert.deepEqual(await counts(id), { accounts: 1, events: 0, settlements: 0, postings: 0, receipts: 1, head: '1' });
  });
});
