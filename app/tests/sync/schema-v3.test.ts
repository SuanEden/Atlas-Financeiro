import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sqlTestServer } from './sql-test-server';
import { recoveryFixture } from '../recovery-fixture';
import { createAccountCommand, createTransactionCommand, reconcileAccountCommand, type CommandContext } from '../../src/application';
import { commandEnvelope, prepareBootstrap, receiptAcknowledges } from '../../src/sync/protocol';
import type { LocalFinancialState } from '../../src/domain';

let server:Awaited<ReturnType<typeof sqlTestServer>>;
beforeAll(async()=>{server=await sqlTestServer();},30_000);
afterAll(async()=>{await server?.close();});
const ctx=(userId:string):CommandContext=>({
  userId,nextId:()=>crypto.randomUUID(),
  now:()=> '2026-11-03T12:30:00.000Z',today:()=> '2026-11-03',
});
describe('I3 schema v3 preparatory compatibility (synthetic only)',()=>{
  it('accepts a v3 bootstrap with reconciliation without changing the original source',async()=>{
    const owner=await server.user(),source=crypto.randomUUID(),state=recoveryFixture(source);
    expect(state.accountReconciliations?.length).toBeGreaterThan(0);
    const first=await prepareBootstrap(state,source,owner,crypto.randomUUID());
    expect(first.data.schemaVersion).toBe(3);
    const receipt=await server.apply(owner,first);
    expect(await receiptAcknowledges(first,receipt)).toBe(true);
    const counts=await server.db.query<{count:number}>(
      'select count(*)::int as count from atlas_private.account_reconciliations where user_id=$1',[owner]);
    expect(counts.rows[0]?.count).toBe(state.accountReconciliations?.length);
    expect((await server.pull(owner)).batches[0]?.envelope).toEqual(first);
    expect(state.accounts.every(a=>a.userId===source)).toBe(true);
  });

  it('allows bank opening balance with reconciliation, then a future imported transaction exactly once',async()=>{
    const owner=await server.user(),source=crypto.randomUUID();
    const initial=createAccountCommand({
      name:'Nubank sintético',kind:'digital',availability:'free',openingDate:'2026-11-02',
      openingBalanceCents:16074n,openingBalanceSource:'Pluggy · saldo confirmado na ativação',
      openingBalanceCertainty:'confirmed',
    },ctx(source));
    const state:LocalFinancialState={
      accounts:initial.aggregate.accounts||[],categories:[],events:initial.aggregate.events||[],
      settlements:initial.aggregate.settlements||[],postings:initial.aggregate.postings||[],
      accountReconciliations:initial.aggregate.accountReconciliations||[],outbox:[initial.operation],
    };
    const packet=await prepareBootstrap(state,source,owner,crypto.randomUUID());
    expect((await server.apply(owner,packet)).revision).toBe('1');
    const accountId=(packet.data.accounts as {id:string}[])[0]!.id;
    const imported=createTransactionCommand({
      accountId,kind:'expense',amountCents:2000n,date:'2026-11-02',
      description:'PIX bancário sintético',realized:true,
    },ctx(owner));
    // Import commands are read-only bank observations; the local domain
    // tags them as 'import' instead of 'manual' before posting.
    imported.aggregate.events![0]!.source='import';
    imported.operation.payloadJson=JSON.stringify({
      ...JSON.parse(imported.operation.payloadJson),
      events:[{...JSON.parse(imported.operation.payloadJson).events[0],source:'import'}],
    });
    const wire=commandEnvelope(imported.operation,'1');
    expect((await server.apply(owner,wire)).revision).toBe('2');
    const countBefore=await server.db.query<{count:number}>('select count(*)::int as count from atlas_private.financial_events where user_id=$1',[owner]);
    expect((await server.apply(owner,wire)).revision).toBe('2');
    const countAfter=await server.db.query<{count:number}>('select count(*)::int as count from atlas_private.financial_events where user_id=$1',[owner]);
    expect(countAfter.rows[0]!.count).toBe(countBefore.rows[0]!.count);
  });

  it('forbids unaudited reconciliation changes and cross-user viewing',async()=>{
    const owner=await server.user(),other=await server.user();
    const source=crypto.randomUUID(),state=recoveryFixture(source);
    const env=await prepareBootstrap(state,source,owner,crypto.randomUUID());
    await server.apply(owner,env);
    const visible=await server.asUser(other,()=>server.db.query('select * from atlas_private.account_reconciliations'));
    expect(visible.rows).toEqual([]);
    await expect(server.asUser(owner,()=>server.db.query(
      "insert into atlas_private.account_reconciliations(user_id,id,account_id,balance_cents,reference_date,source_description,certainty) values($1,$2,$3,100,'2026-11-03','Tentativa sem lote','confirmed')",
      [owner,crypto.randomUUID(),(env.data.accounts as {id:string}[])[0]!.id],
    ))).rejects.toThrow(/batch/);
  });
});
