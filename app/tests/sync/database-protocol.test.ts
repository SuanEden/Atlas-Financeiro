import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sqlTestServer } from './sql-test-server';
import { legacyRecoveryFixture as recoveryFixture } from '../recovery-fixture';
import { commandEnvelope, emptyDataset, envelopeData, jsonDigest, mergeAppendOnly, prepareBootstrap, receiptAcknowledges, type SyncEnvelope, type BootstrapEnvelope } from '../../src/sync/protocol';
import { createAccountCommand, createTransactionCommand, replaceEventCommand, type CommandContext } from '../../src/application';
import { calculateAvailabilityBalances, type LocalFinancialState } from '../../src/domain';
import { canonicalLocalState } from '../../src/backup/validate-i2-backup';

let server: Awaited<ReturnType<typeof sqlTestServer>>;
const context = (userId: string): CommandContext => ({ userId, nextId: () => crypto.randomUUID(), today: () => '2026-10-26', now: () => '2026-10-26T12:00:00.000Z' });
beforeAll(async () => { server=await sqlTestServer(); },30_000);
afterAll(async () => { await server?.close(); });

async function initial() {
  const owner = await server.user(); const source = crypto.randomUUID(); const state = recoveryFixture(source);
  const envelope = await prepareBootstrap(state,source,owner,crypto.randomUUID());
  return { owner, source, state, envelope };
}

describe('protocolo I3 em SQL embarcado com identidade simulada', () => {
  it('canonicalização e SHA-256 concordam entre JS/SQL para Unicode, escapes e centavos em strings', async () => {
    const sample={ b:['café 🚀','\n\t"\\',null,true], a:{ amountCents:'99999999999',schemaVersion:2 } };
    const sql=await server.db.query<{hash:string}>('select atlas_private.json_digest($1::jsonb) as hash',[JSON.stringify(sample)]);
    expect(sql.rows[0]!.hash).toBe(await jsonDigest(sample));
  });

  it('bootstrap preserva fonte, IDs/histórico e cobre pendências uma só vez, inclusive resposta perdida', async () => {
    const {owner,source,state,envelope}=await initial(); const before=canonicalLocalState(state,source);
    const receipt=await server.apply(owner,envelope);
    expect(await receiptAcknowledges(envelope,receipt)).toBe(true);
    expect(receipt.revision).toBe('1'); expect(receipt.coveredOperations).toHaveLength(10);
    expect(await server.apply(owner,envelope)).toEqual(receipt);
    const replayed=commandEnvelope({ ...state.outbox[0]!, userId:owner,payloadJson:JSON.stringify(envelope.coveredOperations[0]!.payload) },'0');
    expect(await server.apply(owner,replayed)).toEqual(receipt);
    expect(await receiptAcknowledges(replayed,receipt)).toBe(true);
    const page=await server.pull(owner);
    expect(page.cursor).toBe('1'); expect(page.batches).toHaveLength(1);
    const restored=mergeAppendOnly(emptyDataset(),envelopeData(page.batches[0]!.envelope),owner);
    expect(calculateAvailabilityBalances(restored)).toEqual(calculateAvailabilityBalances(state));
    for (const table of ['accounts','categories','events','settlements','postings'] as const) expect(restored[table].map((row)=>row.id).sort()).toEqual(state[table].map((row)=>row.id).sort());
    expect(canonicalLocalState(state,source)).toBe(before);
    expect(await server.counts(owner)).toMatchObject({ operation_receipts:'1',sync_batches:'1',incorporated_operations:'10' });
  });

  it('legado sem outbox entra como checkpoint sem comandos históricos inventados', async () => {
    const owner=await server.user(); const source=crypto.randomUUID(); const state=recoveryFixture(source); state.outbox=[];
    const envelope=await prepareBootstrap(state,source,owner,crypto.randomUUID());
    const receipt=await server.apply(owner,envelope);
    expect(receipt.coveredOperations).toEqual([]);
    expect((await server.pull(owner)).batches[0]!.envelope).toEqual(envelope);
  });

  it('recusa mesmo ID com outro conteúdo e não substitui destino já inaugurado', async () => {
    const {owner,envelope}=await initial(); await server.apply(owner,envelope);
    const before=await server.counts(owner);
    const changed=structuredClone(envelope); (changed.data.accounts as {name:string}[])[0]!.name='Mudança sintética';
    await expect(server.apply(owner,changed)).rejects.toThrow(/ID_CONTENT_MISMATCH/);
    await expect(server.apply(owner,{...envelope,operationId:crypto.randomUUID()})).rejects.toThrow(/EMPTY_DESTINATION/);
    expect(await server.counts(owner)).toEqual(before);
  });

  it.each(['number','unknown','foreign-owner','partial-transfer','duplicate-coverage','partial-coverage','version'])('arquivo/pacote inválido (%s) deixa zero linhas, recibos e revisão', async (fault) => {
    const {owner,envelope}=await initial(); const broken=structuredClone(envelope);
    const data=broken.data as Record<string,Record<string,unknown>[]>;
    if(fault==='number') data.events![0]!.amountCents=100003;
    if(fault==='unknown') data.accounts![0]!.unexpected='x';
    if(fault==='foreign-owner') data.accounts![0]!.userId=crypto.randomUUID();
    if(fault==='partial-transfer') {
      const transfer=data.events!.find((row)=>row.kind==='transfer'&&!row.reversesEventId)!;
      const settlement=data.settlements!.find((row)=>row.eventId===transfer.id)!;
      broken.data.postings=data.postings!.filter((row)=>!(row.settlementId===settlement.id&&BigInt(row.amountCents as string)>0n));
      broken.coveredOperations=[]; // Make SQL ledger checks detect the partial transfer, not coverage validation.
    }
    if(fault==='duplicate-coverage') broken.coveredOperations.push(broken.coveredOperations[0]!);
    if(fault==='partial-coverage') (broken.coveredOperations.find((row)=>(row.payload.postings as unknown[]|undefined)?.length===2)!.payload.postings as unknown[]).pop();
    if(fault==='version') (broken as unknown as {protocolVersion:number}).protocolVersion=2;
    await expect(server.apply(owner,broken)).rejects.toThrow();
    expect(Object.values(await server.counts(owner)).every((value)=>value==='0')).toBe(true);
  });

  it('nega usuário sem acesso, anônimo, proprietário adulterado e RLS cruzada', async () => {
    const {owner,envelope}=await initial(); const other=await server.user(); const denied=await server.user(false);
    await expect(server.apply(denied,{...envelope,userId:denied})).rejects.toThrow(/Access denied/);
    await expect(server.apply(null,envelope)).rejects.toThrow(/permission denied/);
    await expect(server.apply(other,envelope)).rejects.toThrow(/identity/);
    await server.apply(owner,envelope);
    expect((await server.pull(other)).batches).toEqual([]);
    const result=await server.asUser(other,()=>server.db.query('select * from atlas_private.financial_events'));
    expect(result.rows).toEqual([]);
    await server.db.query('update atlas_security.app_access set active=false where user_id=$1',[owner]);
    await expect(server.pull(owner)).rejects.toThrow(/Access denied/);
    await expect(server.apply(owner,envelope)).rejects.toThrow(/Access denied/);
  });

  it('transferência, confirmação e lote são atômicos quando a última escrita falha', async () => {
    const {owner,envelope}=await initial();
    await server.db.exec(`create function atlas_private.synthetic_fail_receipt() returns trigger language plpgsql as $$ begin raise exception 'Synthetic last-write failure'; end $$;
      create trigger synthetic_failure before insert on atlas_private.operation_receipts for each row execute function atlas_private.synthetic_fail_receipt();`);
    try { await expect(server.apply(owner,envelope)).rejects.toThrow(/Synthetic last-write/); }
    finally { await server.db.exec('drop trigger synthetic_failure on atlas_private.operation_receipts; drop function atlas_private.synthetic_fail_receipt();'); }
    expect(Object.values(await server.counts(owner)).every((value)=>value==='0')).toBe(true);
    expect((await server.apply(owner,envelope)).revision).toBe('1');
  });

  it('duas correções da mesma versão causam um conflito completo; appends independentes podem comutar', async () => {
    const {owner,envelope}=await initial(); await server.apply(owner,envelope);
    const dataset=envelopeData(envelope); const state:LocalFinancialState={...dataset,outbox:[]}; const ctx=context(owner);
    const original=dataset.events.find((row)=>row.kind==='expense'&&row.status==='confirmed'&&!row.reversesEventId&&!dataset.events.some((other)=>other.reversesEventId===row.id||other.replacesEventId===row.id))!;
    const input={ accountId:original.accountId,kind:'expense' as const,amountCents:200n,date:ctx.today(),description:'Correção concorrente sintética',realized:true };
    const first=replaceEventCommand(state,original.id,input,ctx);
    const second=replaceEventCommand(state,original.id,{...input,amountCents:201n},ctx);
    expect((await server.apply(owner,commandEnvelope(first.operation,'1'))).revision).toBe('2');
    const before=await server.counts(owner);
    await expect(server.apply(owner,commandEnvelope(second.operation,'1'))).rejects.toThrow(/unique/);
    expect(await server.counts(owner)).toEqual(before);
    const income=createTransactionCommand({...input,kind:'income',amountCents:1n},ctx);
    expect((await server.apply(owner,commandEnvelope(income.operation,'1'))).revision).toBe('3');
  });

  it('cursor usa revisões textuais e páginas de agregados completos com limite superior fixo', async () => {
    const owner=await server.user(); const ctx=context(owner);
    for(let n=0;n<3;n++) await server.apply(owner,commandEnvelope(createAccountCommand({name:`Conta sintética ${n}`,kind:'cash',availability:'free',openingDate:ctx.today()},ctx).operation,'0'));
    const first=await server.pull(owner,'0',null,1); expect(first.through).toBe('3'); expect(first.cursor).toBe('1');
    await server.apply(owner,commandEnvelope(createAccountCommand({name:'Conta sintética tardia',kind:'cash',availability:'free',openingDate:ctx.today()},ctx).operation,'3'));
    const rest=await server.pull(owner,first.cursor,first.through,20);
    expect(rest.batches.map((b)=>b.revision)).toEqual(['2','3']); expect(rest.cursor).toBe('3');
    expect((await server.pull(owner,rest.cursor)).batches.map((b)=>b.revision)).toEqual(['4']);
    await expect(server.pull(owner,'999')).rejects.toThrow(/cursor/);
  });

  it('nega DML sem lote/recibo, autoativação e alteração de histórico mesmo com role authenticated', async () => {
    const owner=await server.user();
    await expect(server.asUser(owner,()=>server.db.query(`insert into atlas_private.accounts values ($1,$2,'Conta sem lote','cash','free')`,[owner,crypto.randomUUID()]))).rejects.toThrow(/without committed batch/);
    await expect(server.asUser(owner,()=>server.db.exec('update atlas_security.app_access set active=true'))).rejects.toThrow(/permission denied/);
    await expect(server.asUser(owner,()=>server.db.query('insert into atlas_private.sync_heads values ($1,10)',[owner]))).rejects.toThrow(/protocol commit/);
    const {envelope}=await initial();
    await expect(server.asUser(owner,()=>server.db.query('insert into atlas_private.accounts values ($1,$2,$3,$4,$5)',[envelope.userId,crypto.randomUUID(),'Cruzada','cash','free']))).rejects.toThrow(/row-level security/);
    expect(Object.values(await server.counts(owner)).every((value)=>value==='0')).toBe(true);
  });

  it.each(['old-protocol','future-protocol','future-schema','archive','tombstone'])('contrato incompatível %s não deixa efeito, recibo ou revisão parcial',async fault=>{
    const {owner,envelope}=await initial();const before=await server.counts(owner);
    const broken=structuredClone(envelope) as unknown as Record<string,unknown>;broken.operationId=crypto.randomUUID();
    if(fault==='old-protocol')broken.protocolVersion=0;
    if(fault==='future-protocol')broken.protocolVersion=2;
    if(fault==='future-schema')(broken.data as Record<string,unknown>).schemaVersion=3;
    if(fault==='archive')broken.kind='archive_account';
    if(fault==='tombstone')broken.tombstones=[{id:envelope.operationId,version:1}];
    await expect(server.apply(owner,broken as unknown as SyncEnvelope)).rejects.toThrow();
    expect(await server.counts(owner)).toEqual(before);expect((await server.pull(owner)).cursor).toBe('0');
  });

  it('cliente atrasado não substitui conta existente usando o mesmo ID em uma nova operação',async()=>{
    const {owner,envelope}=await initial();await server.apply(owner,envelope);const before=await server.counts(owner);
    const command=createAccountCommand({name:'Nome atrasado sintético',kind:'cash',availability:'free',openingDate:'2026-10-28'},context(owner));
    const wire=commandEnvelope(command.operation,'0');
    (wire.operation.payload.accounts as {id:string}[])[0]!.id=(envelope.data.accounts as {id:string}[])[0]!.id;
    await expect(server.apply(owner,wire)).rejects.toThrow();expect(await server.counts(owner)).toEqual(before);
    expect((await server.pull(owner)).batches[0]!.envelope).toEqual(envelope);
  });
});
