import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recoveryFixture } from './recovery-fixture';
import type { LocalFinancialState } from '../src/domain';

// Real embedded PostgreSQL; auth service, signed JWT validation, PostgREST and multi-connection
// concurrency are NOT represented by this local test shim.
const ownerA = 'a3000000-0000-4000-8000-000000000001';
const ownerB = 'a3000000-0000-4000-8000-000000000002';
const ownerDenied = 'a3000000-0000-4000-8000-000000000003';
let db: PGlite;

async function insertFixture(state: LocalFinancialState) {
  await db.transaction(async (tx) => {
    for (const row of state.accounts) await tx.query('insert into atlas_private.accounts(user_id,id,name,kind,availability) values ($1,$2,$3,$4,$5)', [row.userId,row.id,row.name,row.kind,row.availability]);
    for (const row of state.categories) await tx.query('insert into atlas_private.categories(user_id,id,name,kind,parent_id) values ($1,$2,$3,$4,$5)', [row.userId,row.id,row.name,row.kind,row.parentId ?? null]);
    for (const row of state.events) await tx.query(`insert into atlas_private.financial_events(user_id,id,kind,status,certainty,source,amount_cents,account_id,transfer_account_id,category_id,description,competence_date,due_date,adjustment_direction,reverses_event_id,replaces_event_id)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [row.userId,row.id,row.kind,row.status,row.certainty,row.source,row.amountCents.toString(),row.accountId,row.transferAccountId ?? null,row.categoryId ?? null,row.description,row.competenceDate,row.dueDate ?? null,row.adjustmentDirection ?? null,row.reversesEventId ?? null,row.replacesEventId ?? null]);
    for (const row of state.settlements) await tx.query('insert into atlas_private.settlements(user_id,id,event_id,amount_cents,payment_date,settlement_date) values ($1,$2,$3,$4,$5,$6)', [row.userId,row.id,row.eventId,row.amountCents.toString(),row.paymentDate,row.settlementDate]);
    for (const row of state.postings) await tx.query('insert into atlas_private.postings(user_id,id,settlement_id,account_id,amount_cents) values ($1,$2,$3,$4,$5)', [row.userId,row.id,row.settlementId,row.accountId,row.amountCents.toString()]);
  });
}

async function asUser<T>(owner: string, work: () => Promise<T>): Promise<T> {
  await db.exec('set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  try { return await work(); } finally { await db.exec('reset role'); }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  const migration = readFileSync(fileURLToPath(new URL('../../supabase/migrations/20261026164923_i3_private_foundation.sql', import.meta.url)), 'utf8');
  await db.exec(migration);
  for (const owner of [ownerA,ownerB,ownerDenied]) await db.query('insert into auth.users values ($1)', [owner]);
  await db.query('insert into atlas_security.app_access values ($1,true),($2,true),($3,false)', [ownerA,ownerB,ownerDenied]);
  await insertFixture(recoveryFixture(ownerA));
  await insertFixture(recoveryFixture(ownerB));
}, 30_000);
afterAll(async () => { await db?.close(); });

describe('migração local I3 em PostgreSQL embarcado', () => {
  it('isola os mesmos IDs financeiros por proprietário com RLS', async () => {
    for (const owner of [ownerA,ownerB]) {
      const result = await asUser(owner, () => db.query<{user_id:string}>('select user_id from atlas_private.accounts'));
      expect(result.rows).toHaveLength(2);
      expect(result.rows.every((row) => row.user_id === owner)).toBe(true);
    }
  });
  it('bloqueia leitura/autorização revogada mesmo com identidade de sessão ainda presente', async () => {
    expect((await asUser(ownerDenied, () => db.query('select * from atlas_private.accounts'))).rows).toEqual([]);
    await expect(asUser(ownerDenied, () => db.query('select api.i3_readiness()'))).rejects.toThrow(/Access denied/);
    await db.query('update atlas_security.app_access set active=false where user_id=$1', [ownerA]);
    expect((await asUser(ownerA, () => db.query('select * from atlas_private.accounts'))).rows).toEqual([]);
    await db.query('update atlas_security.app_access set active=true where user_id=$1', [ownerA]);
  });
  it('não concede escrita financeira, recibos forjados, helpers ou autoativação', async () => {
    for (const sql of [
      'delete from atlas_private.postings',
      'update atlas_security.app_access set active=true',
      'insert into atlas_private.sync_heads(user_id) values (auth.uid())',
      'delete from atlas_private.operation_receipts',
      'select atlas_private.check_ledger()',
    ]) await expect(asUser(ownerA, () => db.exec(sql))).rejects.toThrow(/permission denied/);
    const readiness = await asUser(ownerA, () => db.query<{status:{financialWritesEnabled:boolean}}>('select api.i3_readiness() as status'));
    expect(readiness.rows[0]!.status.financialWritesEnabled).toBe(false);
  });
  it('nega a superfície api ao papel anônimo', async () => {
    await db.exec('set role anon');
    try { await expect(db.query('select api.i3_readiness()')).rejects.toThrow(/permission denied/); }
    finally { await db.exec('reset role'); }
  });
  it('rejeita transferência incompleta no commit e desfaz todas as tabelas do lote', async () => {
    const owner = crypto.randomUUID(); await db.query('insert into auth.users values ($1)', [owner]);
    const state = recoveryFixture(owner);
    const transfer = state.events.find((row) => row.kind === 'transfer' && !row.reversesEventId)!;
    const settlement = state.settlements.find((row) => row.eventId === transfer.id)!;
    state.postings = state.postings.filter((row) => !(row.settlementId === settlement.id && row.amountCents > 0n));
    await expect(insertFixture(state)).rejects.toThrow(/postings/);
    expect((await db.query('select * from atlas_private.accounts where user_id=$1', [owner])).rows).toEqual([]);
    expect((await db.query('select * from atlas_private.financial_events where user_id=$1', [owner])).rows).toEqual([]);
  });
  it('preserva histórico contra update/delete e associações entre usuários', async () => {
    const account = recoveryFixture(ownerA).accounts[0]!;
    await expect(db.query('update atlas_private.financial_events set amount_cents=1 where user_id=$1', [ownerA])).rejects.toThrow(/append-only/);
    await expect(db.query('delete from atlas_private.settlements where user_id=$1', [ownerA])).rejects.toThrow(/append-only/);
    await expect(db.query(`insert into atlas_private.postings values ($1,$2,$3,$4,1)`, [ownerDenied,crypto.randomUUID(),recoveryFixture(ownerA).settlements[0]!.id,account.id])).rejects.toThrow(/foreign key/);
  });
  it('soma centavos no SQL e retorna texto exato sem conversão para number', async () => {
    const result = await asUser(ownerA, () => db.query<{sum:string}>('select sum(amount_cents)::text as sum from atlas_private.postings'));
    expect(result.rows[0]!.sum).toBe('99802');
  });
});
