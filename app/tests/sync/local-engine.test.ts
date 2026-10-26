import 'fake-indexeddb/auto';
import { IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { sqlTestServer } from './sql-test-server';
import { recoveryFixture } from '../recovery-fixture';
import { LocalSyncStore } from '../../src/sync/local-sync-store';
import { SyncEngine, SyncFailure, type SyncTransport, type TransmissionGrant } from '../../src/sync/engine';
import { commandEnvelope, jsonDigest, prepareBootstrap, type ChangePage } from '../../src/sync/protocol';
import { createTransactionCommand, replaceEventCommand, type CommandContext } from '../../src/application';
import { calculateAvailabilityBalances } from '../../src/domain';

let server:Awaited<ReturnType<typeof sqlTestServer>>;
const stores:LocalSyncStore[]=[];
const ctx=(userId:string):CommandContext=>({userId,nextId:()=>crypto.randomUUID(),today:()=> '2026-10-26',now:()=> '2026-10-26T12:00:00.000Z'});
const open=(owner:string,device:string)=>{const store=new LocalSyncStore(owner,'synthetic-test',device);stores.push(store);return store;};
const port=(owner:string):SyncTransport=>({apply:(envelope)=>server.apply(owner,envelope),pull:(after,through)=>server.pull(owner,after,through)});
const grant=(userId:string):TransmissionGrant=>({userId,epoch:1,canTransmit:true});
beforeAll(async()=>{server=await sqlTestServer();},30_000);
afterEach(()=>{vi.restoreAllMocks();stores.splice(0).forEach((store)=>store.close());});
afterAll(async()=>{await server?.close();});

async function associated() {
  const owner=await server.user();const source=crypto.randomUUID();const state=recoveryFixture(source);
  const envelope=await prepareBootstrap(state,source,owner,crypto.randomUUID());
  const store=open(owner,'a');await store.prepareAssociation(envelope);
  const engine=new SyncEngine(store,port(owner),()=>grant(owner));
  expect(await engine.run()).toBe('unassociated');
  expect((await store.read()).meta.binding).toBe('verifying_source');
  await store.activateAssociation(envelope.source.digest);
  return {owner,store,engine,envelope};
}

describe('sync local + PostgreSQL embarcado, dois clientes simulados',()=>{
  it('associação é retomável e só ativa após conferir a fonte; outro cliente recebe o mesmo histórico',async()=>{
    const {owner,store,engine,envelope}=await associated();
    expect(await engine.run()).toBe('synced');
    const before=await store.read();expect(before.pending).toEqual([]);expect(before.meta.cursor).toBe('1');
    const second=open(owner,'b');await second.prepareJoin();
    expect(await new SyncEngine(second,port(owner),()=>grant(owner)).run()).toBe('synced');
    expect((await second.read()).confirmed).toEqual(before.confirmed);
    expect(calculateAvailabilityBalances(before.confirmed).totalCents).toBe(99802n);
    await expect(store.activateAssociation(envelope.source.digest)).rejects.toThrow();
  });

  it('fonte alterada após preparo bloqueia ativação e mantém recibo/dados para conferência',async()=>{
    const owner=await server.user();const source=crypto.randomUUID();const envelope=await prepareBootstrap(recoveryFixture(source),source,owner,crypto.randomUUID());
    const store=open(owner,'changed-source');await store.prepareAssociation(envelope);
    await new SyncEngine(store,port(owner),()=>grant(owner)).run();
    await expect(store.activateAssociation(await jsonDigest({changed:true}))).rejects.toThrow(/origem mudou/);
    expect((await store.read()).meta.binding).toBe('verifying_source');
    expect((await store.read()).receipts).toHaveLength(1);
  });

  it('resposta perdida após commit é recuperada pelo feed sem novo efeito; recarga preserva pendências',async()=>{
    const owner=await server.user();const source=crypto.randomUUID();const envelope=await prepareBootstrap(recoveryFixture(source),source,owner,crypto.randomUUID());
    let store=open(owner,'lost-response');await store.prepareAssociation(envelope);
    const transport=port(owner);
    const engine=new SyncEngine(store,{...transport,apply:async(packet)=>{await transport.apply(packet);throw new SyncFailure('offline','LOST_RESPONSE');}},()=>grant(owner));
    expect(await engine.run()).toBe('offline');
    expect((await store.read()).pending).toHaveLength(1);expect((await store.read()).meta.cursor).toBe('0');
    store.close();store=open(owner,'lost-response');
    await new SyncEngine(store,transport,()=>grant(owner)).run();
    await store.activateAssociation(envelope.source.digest);
    expect((await store.read()).pending).toEqual([]);
    expect(await server.counts(owner)).toMatchObject({sync_batches:'1',operation_receipts:'1'});
  });

  it('ACK não elimina efeito local antes do pull; repetição/reconexão não duplica',async()=>{
    const {owner,store,engine}=await associated();const before=await store.read();
    const command=createTransactionCommand({accountId:before.projection.accounts[0]!.id,kind:'income',amountCents:1n,date:ctx(owner).today(),description:'Centavo offline sintético',realized:true},ctx(owner));
    const envelope=commandEnvelope(command.operation,before.meta.cursor);await store.enqueue(envelope);
    expect(calculateAvailabilityBalances((await store.read()).projection).totalCents).toBe(99803n);
    const receipt=await server.apply(owner,envelope);await store.acknowledge(envelope.operationId,receipt);
    const acknowledged=await store.read();expect(acknowledged.pending[0]!.status).toBe('acknowledged');
    expect(calculateAvailabilityBalances(acknowledged.confirmed).totalCents).toBe(99802n);
    expect(calculateAvailabilityBalances(acknowledged.projection).totalCents).toBe(99803n);
    expect(await engine.run()).toBe('synced');expect(await engine.run()).toBe('synced');
    expect((await store.read()).pending).toEqual([]);expect((await store.read()).meta.cursor).toBe('2');
  });

  it('offline e sessão expirada não transmitem; logout/troca durante chamada não ativam outra sessão',async()=>{
    const owner=await server.user();const source=crypto.randomUUID();const envelope=await prepareBootstrap(recoveryFixture(source),source,owner,crypto.randomUUID());
    const store=open(owner,'session-race');await store.prepareAssociation(envelope);
    let permission=grant(owner);const transport=port(owner);const apply=vi.fn(transport.apply);const pull=vi.fn(transport.pull);
    expect(await new SyncEngine(store,{apply,pull},()=>permission,()=>false).run()).toBe('offline');
    permission={...permission,canTransmit:false};
    expect(await new SyncEngine(store,{apply,pull},()=>permission).run()).toBe('login_required');
    expect(apply).not.toHaveBeenCalled();expect(pull).not.toHaveBeenCalled();
    permission=grant(owner);
    const race={...transport,apply:async(packet:typeof envelope)=>{const receipt=await transport.apply(packet);permission={userId:crypto.randomUUID(),epoch:2,canTransmit:true};return receipt;}};
    expect(await new SyncEngine(store,race,()=>permission).run()).toBe('login_required');
    expect((await store.read()).pending).toHaveLength(1);expect((await store.read()).receipts).toEqual([]);
    permission={userId:owner,epoch:3,canTransmit:true};await new SyncEngine(store,transport,()=>permission).run();
    await store.activateAssociation(envelope.source.digest);expect((await store.read()).pending).toEqual([]);
  });

  it('falha final IndexedDB mantém cursor e dados anteriores; repetir página aplica tudo uma vez',async()=>{
    const {owner}=await associated();const second=open(owner,'quota');await second.prepareJoin();const page=await server.pull(owner);
    const put=FakeObjectStore.prototype.put;
    const failure=vi.spyOn(FakeObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value:unknown,key?:IDBValidKey){
      if(this.name==='meta') throw new DOMException('Synthetic quota failure','QuotaExceededError');
      return key===undefined?put.call(this,value):put.call(this,value,key);
    });
    await expect(second.applyPage(page)).rejects.toThrow(/quota/);failure.mockRestore();
    const failed=await second.read();expect(failed.meta.cursor).toBe('0');expect(failed.confirmed.accounts).toEqual([]);expect(failed.receipts).toEqual([]);
    await second.applyPage(page);expect((await second.read()).meta.cursor).toBe('1');expect((await second.read()).confirmed.accounts).toHaveLength(2);
  });

  it.each(['gap','wrong-owner','receipt','unknown-protocol','wrong-cursor'])('página inválida (%s) não avança cursor nem grava parcialmente',async(fault)=>{
    const {owner}=await associated();const store=open(owner,`bad-${fault}`);await store.prepareJoin();const page=structuredClone(await server.pull(owner));
    if(fault==='gap') page.batches[0]!.revision='2';
    if(fault==='wrong-owner') page.userId=crypto.randomUUID();
    if(fault==='receipt') page.batches[0]!.receipt.digest='0'.repeat(64);
    if(fault==='unknown-protocol') (page.batches[0]!.envelope as unknown as {protocolVersion:number}).protocolVersion=2;
    if(fault==='wrong-cursor') page.cursor='9';
    await expect(store.applyPage(page)).rejects.toThrow();
    expect((await store.read()).meta.cursor).toBe('0');expect((await store.read()).confirmed.accounts).toEqual([]);
  });

  it('correções offline concorrentes preservam perdedor fora dos saldos, sem apagar seu comando',async()=>{
    const {owner,store:first,engine:engineA}=await associated();const second=open(owner,'conflicting');await second.prepareJoin();const engineB=new SyncEngine(second,port(owner),()=>grant(owner));await engineB.run();
    const initial=await first.read();const original=initial.projection.events.find((row)=>row.kind==='income'&&row.status==='planned')!;
    const input={accountId:original.accountId,kind:'income' as const,amountCents:11000n,date:'2026-10-26',description:'Correção offline sintética',realized:true};
    const commandA=replaceEventCommand(initial.projection,original.id,input,ctx(owner));
    const commandB=replaceEventCommand((await second.read()).projection,original.id,{...input,amountCents:12000n},ctx(owner));
    await first.enqueue(commandEnvelope(commandA.operation,'1'));await second.enqueue(commandEnvelope(commandB.operation,'1'));
    expect(await engineA.run()).toBe('synced');expect(await engineB.run()).toBe('conflict');
    const lost=await second.read();expect(lost.pending).toHaveLength(1);expect(lost.pending[0]!.id).toBe(commandB.operation.id);expect(lost.pending[0]!.status).toBe('conflict');
    expect(lost.confirmed).toEqual((await first.read()).confirmed);expect(lost.projection).toEqual(lost.confirmed);
    expect(calculateAvailabilityBalances(lost.confirmed).totalCents).toBe(110802n);
  });
});
