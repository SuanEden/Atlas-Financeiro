import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LocalSyncStore } from '../../src/sync/local-sync-store';
import { SyncEngine, type SyncTransport } from '../../src/sync/engine';
import { commandEnvelope, isI3SchemaCompatible, prepareBootstrap } from '../../src/sync/protocol';
import { serializeMonthlyRecurrenceRule } from '../../src/domain';
import { createAccountCommand } from '../../src/application';
import { recoveryFixture } from '../recovery-fixture';
import { sqlTestServer } from './sql-test-server';

const handles: {close():void}[]=[];
let server:Awaited<ReturnType<typeof sqlTestServer>>;
beforeAll(async()=>{server=await sqlTestServer();},30_000);
afterAll(async()=>{await server?.close();});
afterEach(()=>{handles.splice(0).forEach(handle=>handle.close());});

async function fixture() {
  const owner=await server.user();
  const store=new LocalSyncStore(owner,'synthetic-compatibility',crypto.randomUUID());handles.push(store);
  const raw=new Dexie(store.name);raw.version(1).stores({confirmed:'id',pending:'id,ordinal,status',receipts:'id,revision',meta:'id'});handles.push(raw);
  const source=crypto.randomUUID();const envelope=await prepareBootstrap(recoveryFixture(source),source,owner,crypto.randomUUID());
  await store.prepareAssociation(envelope);
  const transport:SyncTransport={apply:vi.fn(packet=>server.apply(owner,packet)),pull:vi.fn((after,through)=>server.pull(owner,after,through))};
  const engine=new SyncEngine(store,transport,()=>({userId:owner,epoch:1,canTransmit:true}));
  const snapshot=async()=>Object.fromEntries(await Promise.all(['confirmed','pending','receipts','meta'].map(async table=>[table,await raw.table(table).toArray()])));
  return {owner,store,raw,envelope,transport,engine,snapshot};
}

describe('compatibilidade local preserva bytes/IDs e falha antes do envio',()=>{
  it('retoma metadados v1 conhecidos sem versão explícita, sem migração silenciosa',async()=>{
    const f=await fixture();const meta=await f.raw.table('meta').get('context');delete meta.version;await f.raw.table('meta').put(meta);
    const before=await f.snapshot();await f.store.read();expect(await f.snapshot()).toEqual(before);
    expect(await f.engine.run()).toBe('unassociated');await f.store.activateAssociation(f.envelope.source.digest);
    expect((await f.store.read()).meta.binding).toBe('active');
  });

  it.each(['future-version','future-field','future-binding','bad-cursor','bad-ordinal','missing-context','extra-context'])('contexto %s impede consulta/envio/alteração sem apagar a base',async fault=>{
    const f=await fixture();const meta=await f.raw.table('meta').get('context');
    if(fault==='future-version')meta.version=2;
    if(fault==='future-field')meta.archivedEntities=[];
    if(fault==='future-binding')meta.binding='future-active';
    if(fault==='bad-cursor')meta.cursor='01';
    if(fault==='bad-ordinal')meta.ordinal=-1;
    if(fault==='missing-context')await f.raw.table('meta').delete('context');
    else await f.raw.table('meta').put(meta);
    if(fault==='extra-context')await f.raw.table('meta').put({...meta,id:'future-context'});
    const before=await f.snapshot();
    await expect(f.store.read()).rejects.toThrow();
    expect(await f.engine.run()).toBe('retry_later');
    await expect(f.store.prepareJoin()).rejects.toThrow();
    await expect(f.store.markConflict(f.envelope.operationId,'SYNTHETIC')).rejects.toThrow();
    await expect(f.store.acknowledge(f.envelope.operationId,await server.apply(f.owner,f.envelope))).rejects.toThrow();
    expect(f.transport.pull).not.toHaveBeenCalled();expect(f.transport.apply).not.toHaveBeenCalled();
    expect(await f.snapshot()).toEqual(before);
  });

  it.each(['future-protocol','future-field','future-status','wrong-owner','wrong-id','changed-digest','changed-payload','changed-operation-digest','resolved-future'])('pendência %s permanece intacta e não chega ao transporte',async fault=>{
    const f=await fixture();const row=await f.raw.table('pending').get(f.envelope.operationId);
    if(fault==='future-protocol'||fault==='resolved-future')row.envelope.protocolVersion=2;
    if(fault==='resolved-future')row.status='resolved';
    if(fault==='future-field')row.tombstone=true;
    if(fault==='future-status')row.status='archived';
    if(fault==='wrong-owner')row.envelope.userId=crypto.randomUUID();
    if(fault==='wrong-id')row.envelope.operationId=crypto.randomUUID();
    if(fault==='changed-digest')row.digest='0'.repeat(64);
    if(fault==='changed-payload')row.envelope.data.accounts[0].name='Conteúdo alterado sintético';
    if(fault==='changed-operation-digest')row.operationDigest='0'.repeat(64);
    await f.raw.table('pending').put(row);const before=await f.snapshot();
    expect(await f.engine.run()).toBe('retry_later');
    expect(f.transport.pull).not.toHaveBeenCalled();expect(f.transport.apply).not.toHaveBeenCalled();
    expect(await f.snapshot()).toEqual(before);
  });

  it.each(['version','payload'])('feed não remove pendência alterada (%s) mesmo que o recibo tenha o digest anterior',async fault=>{
    const f=await fixture();await server.apply(f.owner,f.envelope);
    const row=await f.raw.table('pending').get(f.envelope.operationId);
    if(fault==='version')row.envelope.protocolVersion=2;
    else row.envelope.data.accounts[0].name='Outra versão sintética';
    await f.raw.table('pending').put(row);
    const before=await f.snapshot();await expect(f.store.applyPage(await server.pull(f.owner))).rejects.toThrow();
    expect(await f.snapshot()).toEqual(before);
  });

  it('conteúdo alterado por outra aba depois do pull é recusado antes de apply',async()=>{
    const f=await fixture();const pull=f.transport.pull;
    f.transport.pull=vi.fn(async(after,through)=>{
      const page=await pull(after,through);const row=await f.raw.table('pending').get(f.envelope.operationId);
      row.envelope.data.accounts[0].name='Outra aba sintética';await f.raw.table('pending').put(row);return page;
    });
    expect(await new SyncEngine(f.store,f.transport,()=>({userId:f.owner,epoch:1,canTransmit:true})).run()).toBe('retry_later');
    expect(f.transport.apply).not.toHaveBeenCalled();expect((await server.counts(f.owner)).sync_batches).toBe('0');
    expect((await f.raw.table('pending').toArray())[0].envelope.data.accounts[0].name).toBe('Outra aba sintética');
  });

  it('limite superior alterado no meio da paginação não incorpora a segunda página',async()=>{
    const owner=await server.user();const store=new LocalSyncStore(owner,'synthetic-compatibility',crypto.randomUUID());handles.push(store);await store.prepareJoin();
    for(let n=0;n<2;n++)await server.apply(owner,commandEnvelope(createAccountCommand({name:`Conta sintética ${n}`,kind:'cash',availability:'free',openingDate:'2026-10-28'},{userId:owner,nextId:()=>crypto.randomUUID(),today:()=> '2026-10-28',now:()=> '2026-10-28T12:00:00.000Z'}).operation,'0'));
    const apply=vi.fn();const pull=vi.fn(async(after:string,through:string|null)=>{
      const page=await server.pull(owner,after,through,1);return through===null?page:{...page,through:'3'};
    });
    expect(await new SyncEngine(store,{apply,pull},()=>({userId:owner,epoch:1,canTransmit:true})).run()).toBe('retry_later');
    expect((await store.read()).meta.cursor).toBe('1');expect((await store.read()).confirmed.accounts).toHaveLength(1);expect(apply).not.toHaveBeenCalled();
  });
});


describe('bloqueio seguro de recursos locais ainda não migrados no servidor', () => {
  it('preserva bootstrap com recorrência sem chamar o transporte remoto', async () => {
    const owner = await server.user();
    const source = crypto.randomUUID();
    const data = recoveryFixture(source);
    data.events.push({
      id: crypto.randomUUID(), userId: source, kind: 'expense', source: 'manual', status: 'planned', certainty: 'confirmed',
      amountCents: 1_300n, accountId: data.accounts[0]!.id, categoryId: data.categories[0]!.id,
      description: 'Recorrência sintética', competenceDate: '2026-11-01',
      recurrenceJson: serializeMonthlyRecurrenceRule({
        frequency: 'monthly', status: 'active', startMonth: '2026-11', nextOccurrenceMonth: '2026-11',
        necessity: 'unknown', amountBasis: 'fixed', firstOccurrence: 'normal',
      }),
    });
    const envelope = await prepareBootstrap(data, source, owner, crypto.randomUUID());
    expect(isI3SchemaCompatible(envelope)).toBe(false);
    const store = new LocalSyncStore(owner, 'synthetic-compatibility', crypto.randomUUID()); handles.push(store);
    await store.prepareAssociation(envelope);
    const transport: SyncTransport = { apply: vi.fn(), pull: vi.fn() };
    const engine = new SyncEngine(store, transport, () => ({ userId: owner, epoch: 1, canTransmit: true }));
    expect(await engine.run()).toBe('retry_later');
    expect(transport.pull).not.toHaveBeenCalled();
    expect(transport.apply).not.toHaveBeenCalled();
    expect((await store.read()).pending).toHaveLength(1);
  });

  it('identifica saldo zero e conciliação de conta fora do contrato SQL atual', async () => {
    const f = await fixture();
    const operationId = crypto.randomUUID();
    const envelope = {
      protocolVersion: 1 as const, operationId, userId: f.owner, baseRevision: '0',
      kind: 'record_event' as const,
      operation: {
        id: operationId, userId: f.owner, kind: 'record_event' as const, createdAt: '2026-10-30T12:00:00.000Z',
        payload: { events: [{ id: crypto.randomUUID(), source: 'opening_balance', amountCents: '0', kind: 'adjustment' }] },
      },
    };
    expect(isI3SchemaCompatible(envelope)).toBe(false);
  });
});
