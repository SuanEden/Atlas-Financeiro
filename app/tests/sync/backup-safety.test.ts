import 'fake-indexeddb/auto';
import { IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { sqlTestServer } from './sql-test-server';
import { recoveryFixture } from '../recovery-fixture';
import { createAccountCommand, createTransactionCommand, replaceEventCommand, type CommandContext } from '../../src/application';
import { calculateAvailabilityBalances } from '../../src/domain';
import { createLocalFinancialStore } from '../../src/persistence';
import { deserializeFinancialDataset, serializeFinancialDataset } from '../../src/serialization';
import { LocalSyncStore } from '../../src/sync/local-sync-store';
import { exportSyncBackup } from '../../src/sync/export-backup';
import { SyncEngine, SyncFailure, type SyncTransport } from '../../src/sync/engine';
import { commandEnvelope, envelopeData, jsonDigest, prepareBootstrap } from '../../src/sync/protocol';

// Synthetic identities, in-memory SQL and fake IndexedDB only. No hosted credentials or network.
const serverId='synthetic-backup';
const stores:LocalSyncStore[]=[];
let server:Awaited<ReturnType<typeof sqlTestServer>>;
const ctx=(userId:string):CommandContext=>({userId,nextId:()=>crypto.randomUUID(),today:()=> '2026-10-27',now:()=> '2026-10-27T12:00:00.000Z'});
const open=(owner:string,device='source')=>{const store=new LocalSyncStore(owner,serverId,device);stores.push(store);return store;};
const port=(owner:string):SyncTransport=>({apply:envelope=>server.apply(owner,envelope),pull:(after,through)=>server.pull(owner,after,through)});
const engine=(store:LocalSyncStore,transport=port(store.userId))=>new SyncEngine(store,transport,()=>({userId:store.userId,epoch:1,canTransmit:true}));
const copy=(store:LocalSyncStore)=>exportSyncBackup(store,serverId);
const stableCopy=async(store:LocalSyncStore)=>{const {exportedAt,...state}=JSON.parse(await copy(store));expect(Number.isFinite(Date.parse(exportedAt))).toBe(true);return state;};

beforeAll(async()=>{server=await sqlTestServer();},30_000);
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();stores.splice(0).forEach(store=>store.close());});
afterAll(async()=>{await server?.close();});

async function prepared() {
  const owner=await server.user();const sourceOwner=crypto.randomUUID();const source=recoveryFixture(sourceOwner);
  const bootstrap=await prepareBootstrap(source,sourceOwner,owner,crypto.randomUUID());
  const store=open(owner);await store.prepareAssociation(bootstrap);
  return {owner,sourceOwner,source,bootstrap,store};
}
async function associated() {
  const result=await prepared();await engine(result.store).run();
  await result.store.activateAssociation(result.bootstrap.source.digest);return result;
}
async function income(store:LocalSyncStore,amountCents=1n) {
  const state=await store.read();
  return commandEnvelope(createTransactionCommand({accountId:state.projection.accounts[0]!.id,kind:'income',amountCents,date:ctx(store.userId).today(),description:'Receita offline sintética',realized:true},ctx(store.userId)).operation,state.meta.cursor);
}

describe('proteção operacional da cópia I3 — sem importador I3/I4',()=>{
  it('preserva associação ainda não enviada e proveniência exata após reabrir o namespace',async()=>{
    const {owner,sourceOwner,source,bootstrap,store}=await prepared();
    const before=await stableCopy(store);store.close();const reopened=open(owner);
    expect(await stableCopy(reopened)).toEqual(before);
    expect(before).toMatchObject({format:'atlas-financeiro-sync-backup',schemaVersion:1,protocolVersion:1,userId:owner,serverId,meta:{binding:'bootstrap',cursor:'0',associationId:bootstrap.operationId,sourceOwnerId:sourceOwner,sourceDigest:bootstrap.source.digest,sourceMode:'i2'}});
    expect(before.pending[0]).toMatchObject({id:bootstrap.operationId,status:'pending',envelope:bootstrap,digest:await jsonDigest(bootstrap)});
    expect(before.pending[0].envelope.coveredOperations.map((row:{id:string})=>row.id)).toEqual(source.outbox.map(row=>row.id));
    expect(before.confirmed.accounts).toEqual([]);expect(before.receipts).toEqual([]);
    expect(deserializeFinancialDataset(JSON.stringify(before.projection),owner)).toEqual((await reopened.read()).projection);
    expect((await server.counts(owner)).sync_batches).toBe('0');
  });

  it('não ativa associação se a origem mudou, preservando recibo e cópia para conferência',async()=>{
    const {owner,bootstrap,store}=await prepared();await engine(store).run();
    store.close();const reopened=open(owner);const before=await stableCopy(reopened);
    await expect(reopened.activateAssociation('0'.repeat(64))).rejects.toThrow(/origem mudou/);
    expect(await stableCopy(reopened)).toEqual(before);
    expect(before.meta).toMatchObject({binding:'verifying_source',associationId:bootstrap.operationId});
    expect(before.receipts).toHaveLength(1);expect(before.pending).toEqual([]);
  });

  it('cópia offline preserva centavos, IDs e comando não confirmado sem alterar o banco',async()=>{
    const {owner,store}=await associated();const envelope=await income(store,12345n);await store.enqueue(envelope);
    const before=await store.read();const backup=await stableCopy(store);
    expect(await store.read()).toEqual(before);store.close();const reopened=open(owner);
    expect(await stableCopy(reopened)).toEqual(backup);
    expect(backup.meta).toMatchObject({cursor:'1',binding:'active'});
    expect(backup.pending).toHaveLength(1);expect(backup.pending[0]).toMatchObject({id:envelope.operationId,status:'pending',envelope});
    expect(backup.pending[0].digest).toBe(await jsonDigest(envelope));
    expect(backup.pending[0].operationDigest).toBe(await jsonDigest(envelope.operation));
    expect(backup.projection.events.find((row:{id:string})=>row.id===envelopeData(envelope).events[0]!.id)?.amountCents).toBe('12345');
    expect(calculateAvailabilityBalances(deserializeFinancialDataset(JSON.stringify(backup.projection),owner)).totalCents).toBe(112147n);
    expect(calculateAvailabilityBalances(deserializeFinancialDataset(JSON.stringify(backup.confirmed),owner)).totalCents).toBe(99802n);
    expect((await server.counts(owner)).sync_batches).toBe('1');
  });

  it('commit com resposta perdida deixa comando na cópia; reabrir e ler feed não duplica nem reenvia',async()=>{
    const {owner,store}=await associated();const envelope=await income(store);await store.enqueue(envelope);
    const transport=port(owner);
    expect(await engine(store,{...transport,apply:async packet=>{await transport.apply(packet);throw new SyncFailure('offline','SYNTHETIC_LOST_RESPONSE');}}).run()).toBe('offline');
    const before=await stableCopy(store);store.close();const reopened=open(owner);
    expect(await stableCopy(reopened)).toEqual(before);
    expect(before.meta.cursor).toBe('1');expect(before.pending[0].status).toBe('pending');expect(before.receipts).toHaveLength(1);
    const apply=vi.fn(transport.apply);expect(await engine(reopened,{...transport,apply}).run()).toBe('synced');
    expect(apply).not.toHaveBeenCalled();
    const after=await stableCopy(reopened);expect(after.pending).toEqual([]);expect(after.meta.cursor).toBe('2');expect(after.receipts).toHaveLength(2);
    expect(after.projection).toEqual(before.projection);expect(after.confirmed).toEqual(after.projection);
    expect(await server.counts(owner)).toMatchObject({sync_batches:'2',operation_receipts:'2'});
  });

  it('recibo antes do feed é preservado com a pendência e projeção única após reabertura',async()=>{
    const {owner,store}=await associated();const envelope=await income(store);await store.enqueue(envelope);
    await store.acknowledge(envelope.operationId,await server.apply(owner,envelope));
    const before=await stableCopy(store);store.close();const reopened=open(owner);
    expect(await stableCopy(reopened)).toEqual(before);expect(before.pending[0].status).toBe('acknowledged');
    expect(before.meta.cursor).toBe('1');expect(before.receipts).toHaveLength(2);
    const apply=vi.fn(port(owner).apply);expect(await engine(reopened,{...port(owner),apply}).run()).toBe('synced');
    expect(apply).not.toHaveBeenCalled();const after=await stableCopy(reopened);
    expect(after.projection).toEqual(before.projection);expect(after.pending).toEqual([]);
  });

  it('falha final ao incorporar página reverte dados/cursor/remoção da pendência juntos',async()=>{
    const {owner,store}=await associated();const envelope=await income(store);await store.enqueue(envelope);
    await store.acknowledge(envelope.operationId,await server.apply(owner,envelope));
    const before=await stableCopy(store);const page=await server.pull(owner,'1');
    const put=FakeObjectStore.prototype.put;
    const failure=vi.spyOn(FakeObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value:unknown,key?:IDBValidKey){
      if(this.name==='meta')throw new DOMException('Synthetic disk failure','QuotaExceededError');
      return key===undefined?put.call(this,value):put.call(this,value,key);
    });
    await expect(store.applyPage(page)).rejects.toThrow(/disk failure/);failure.mockRestore();
    store.close();const reopened=open(owner);expect(await stableCopy(reopened)).toEqual(before);
    await reopened.applyPage(page);expect((await reopened.read()).pending).toEqual([]);
    expect((await stableCopy(reopened)).projection).toEqual(before.projection);
    expect((await reopened.read()).meta.cursor).toBe('2');
  });

  it('cópia concorrente de outra conexão contém estado inteiro anterior ou posterior à gravação',async()=>{
    const {owner,store}=await associated();const writer=open(owner);let before=await stableCopy(store);
    for(let index=0;index<4;index++) {
      const envelope=await income(writer);const [during]=await Promise.all([stableCopy(store),writer.enqueue(envelope)]);
      const after=await stableCopy(store);expect([before,after]).toContainEqual(during);
      expect(after.meta.ordinal).toBe(before.meta.ordinal+1);expect(after.pending).toHaveLength(index+1);before=after;
    }
  });

  it('conflito, dependência bloqueada e decisão resolvida continuam na cópia sem reenviar',async()=>{
    const {owner,store:first}=await associated();const second=open(owner,'conflicting');await second.prepareJoin();await engine(second).run();
    const base=await first.read();const original=base.projection.events.find(row=>row.kind==='income'&&row.status==='planned')!;
    const input={accountId:original.accountId,kind:'income' as const,amountCents:11000n,date:ctx(owner).today(),description:'Correção sintética',realized:true};
    const winner=replaceEventCommand(base.projection,original.id,input,ctx(owner));
    const loser=replaceEventCommand(base.projection,original.id,{...input,amountCents:12000n},ctx(owner));
    await first.enqueue(commandEnvelope(winner.operation,'1'));await second.enqueue(commandEnvelope(loser.operation,'1'));
    const losingEvent=loser.aggregate.events!.find(row=>row.kind==='income')!;
    const dependent=replaceEventCommand((await second.read()).projection,losingEvent.id,{...input,amountCents:13000n},ctx(owner));
    await second.enqueue(commandEnvelope(dependent.operation,'1'));
    await engine(first).run();expect(await engine(second).run()).toBe('conflict');
    const before=await stableCopy(second);expect(before.pending.map((row:{status:string})=>row.status)).toEqual(['conflict','blocked']);
    expect(before.projection).toEqual(before.confirmed);
    second.close();const reopened=open(owner,'conflicting');expect(await stableCopy(reopened)).toEqual(before);
    await reopened.resolveConflict(loser.operation.id);
    const apply=vi.fn(port(owner).apply);expect(await engine(reopened,{...port(owner),apply}).run()).toBe('conflict');
    expect(apply).not.toHaveBeenCalled();const after=await stableCopy(reopened);
    expect(after.pending.map((row:{status:string})=>row.status)).toEqual(['resolved','blocked']);
    expect(after.pending.map((row:{envelope:unknown})=>row.envelope)).toEqual(before.pending.map((row:{envelope:unknown})=>row.envelope));
    expect(after.projection).toEqual(before.confirmed);
  });

  it('base nova recebe só o confirmado; comando offline permanece apenas na origem e na cópia',async()=>{
    const {owner,store}=await associated();const envelope=await income(store);await store.enqueue(envelope);
    const archive=await stableCopy(store);const target=open(owner,'clean-device');await target.prepareJoin();await engine(target).run();
    const received=await stableCopy(target);
    expect(received.confirmed).toEqual(archive.confirmed);expect(received.projection).toEqual(archive.confirmed);
    expect(received.pending).toEqual([]);expect(received.projection).not.toEqual(archive.projection);
    expect(archive.pending[0].id).toBe(envelope.operationId);
    // Retained source can resume with the original ID. This is NOT importing the archive.
    expect(await engine(store).run()).toBe('synced');expect(await engine(target).run()).toBe('synced');
    expect((await target.read()).confirmed).toEqual((await store.read()).confirmed);
  });

  it('importador I2 recusa a cópia I3 sem modificar destino vazio ou existente',async()=>{
    const {owner,store}=await associated();const archive=await copy(store);const target=createLocalFinancialStore(owner);
    try {
      const empty=await target.readLocalState();await expect(target.recoverI2Backup(archive)).rejects.toThrow(/não suportado/);
      expect(await target.readLocalState()).toEqual(empty);
      const command=createAccountCommand({name:'Destino sintético preservado',kind:'cash',availability:'free',openingDate:ctx(owner).today()},ctx(owner));
      await target.commitOperation(command.aggregate,command.operation);
      const before=await target.readLocalState();await expect(target.recoverI2Backup(archive)).rejects.toThrow(/não suportado/);
      expect(await target.readLocalState()).toEqual(before);
    } finally {target.close();}
  });

  it('não lê sessão/configuração Auth e recusa rotular o arquivo com outro servidor',async()=>{
    const {store}=await associated();const getItem=vi.fn(()=>{throw new Error('Auth storage must not be read');});
    vi.stubGlobal('localStorage',{getItem});vi.stubGlobal('sessionStorage',{getItem});
    const archive=await stableCopy(store);expect(getItem).not.toHaveBeenCalled();
    expect(Object.keys(archive).sort()).toEqual(['format','schemaVersion','protocolVersion','userId','serverId','confirmed','projection','pending','receipts','meta'].sort());
    const before=await store.read();await expect(exportSyncBackup(store,'synthetic-other-server')).rejects.toThrow(/servidor/);
    expect(await store.read()).toEqual(before);
  });

  it('falha de leitura não produz um arquivo parcial nem altera a base',async()=>{
    const {store}=await associated();const before=await stableCopy(store);
    const get=FakeObjectStore.prototype.get;
    const failure=vi.spyOn(FakeObjectStore.prototype,'get').mockImplementation(function(this:IDBObjectStore,key:IDBValidKey|IDBKeyRange){
      if(this.name==='confirmed')throw new DOMException('Synthetic unreadable database','UnknownError');
      return get.call(this,key);
    });
    await expect(copy(store)).rejects.toThrow(/unreadable database/);failure.mockRestore();
    expect(await stableCopy(store)).toEqual(before);
    expect(serializeFinancialDataset((await store.read()).projection,store.userId)).toBe(JSON.stringify(before.projection));
  });
});
