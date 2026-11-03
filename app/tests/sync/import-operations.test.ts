import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { sqlTestServer } from './sql-test-server';
import { LocalSyncStore } from '../../src/sync/local-sync-store';
import { SyncEngine } from '../../src/sync/engine';
import { commandEnvelope, prepareBootstrap } from '../../src/sync/protocol';
import { createCategoryCommand, createTransactionCommand, type CommandContext } from '../../src/application';
import { legacyRecoveryFixture } from '../recovery-fixture';

let server:Awaited<ReturnType<typeof sqlTestServer>>;
const stores:LocalSyncStore[]=[];
const context=(userId:string):CommandContext=>({userId,nextId:()=>crypto.randomUUID(),now:()=>new Date().toISOString(),today:()=> '2026-11-03'});
const open=(owner:string,device:string)=>{
  const store=new LocalSyncStore(owner,'synthetic-import',device);stores.push(store);return store;
};
const engine=(store:LocalSyncStore)=>new SyncEngine(store,{
  apply:packet=>server.apply(store.userId,packet),
  pull:(after,through)=>server.pull(store.userId,after,through),
},()=>({userId:store.userId,epoch:1,canTransmit:true,serverSchemaVersion:3}));

beforeAll(async()=>{server=await sqlTestServer();},30_000);
afterEach(()=>{stores.splice(0).forEach(store=>store.close());});
afterAll(async()=>{await server.close();});

describe('importação append-only de I3 em base associada',()=>{
  it('importa duas operações atomicamente, evita duplicatas e sincroniza uma vez',async()=>{
    const owner=await server.user();
    const sourceOwner=crypto.randomUUID();
    const bootstrap=await prepareBootstrap(legacyRecoveryFixture(sourceOwner),sourceOwner,owner,crypto.randomUUID());
    const store=open(owner,'import-new');
    await store.prepareAssociation(bootstrap);
    await engine(store).run();
    await store.activateAssociation(bootstrap.source.digest);
    await engine(store).run();
    const original=await store.read();
    const accountId=original.projection.accounts[0]!.id;
    const category=createCategoryCommand({name:'Teste I3 categoria',kind:'income'},context(owner));
    const income=createTransactionCommand({accountId,kind:'income',amountCents:12345n,description:'Teste I3 renda',date:'2026-11-03',realized:true},context(owner));
    const packets=[category,income].map(command=>commandEnvelope(command.operation,original.meta.cursor));
    expect(await store.importPendingFromBackup(original.confirmed,packets)).toBe(2);
    const after=await store.read();
    expect(after.pending).toHaveLength(2);
    expect(after.projection.categories.some(row=>row.name==='Teste I3 categoria')).toBe(true);
    expect(after.projection.events.some(row=>row.description==='Teste I3 renda'&&row.amountCents===12345n)).toBe(true);
    expect(await store.importPendingFromBackup(original.confirmed,packets)).toBe(0);
    expect((await store.read()).pending).toHaveLength(2);
    expect(await engine(store).run()).toBe('synced');
    expect((await store.read()).pending).toEqual([]);
    const batches=await server.counts(owner);
    expect(batches.sync_batches).toBe('3');
  });

  it('rejeita histórico divergente e dependência inexistente sem importar parcialmente',async()=>{
    const owner=await server.user();
    const sourceOwner=crypto.randomUUID();
    const bootstrap=await prepareBootstrap(legacyRecoveryFixture(sourceOwner),sourceOwner,owner,crypto.randomUUID());
    const store=open(owner,'import-rejected');
    await store.prepareAssociation(bootstrap);
    await engine(store).run();
    await store.activateAssociation(bootstrap.source.digest);
    await engine(store).run();
    const initial=await store.read();
    const good=createCategoryCommand({name:'Não deve aparecer',kind:'expense'},context(owner));
    const invalid=createTransactionCommand({
      accountId:crypto.randomUUID(),kind:'expense',amountCents:2000n,description:'Referência inexistente',
      date:'2026-11-03',realized:true,
    },context(owner));
    const packets=[good,invalid].map(command=>commandEnvelope(command.operation,initial.meta.cursor));
    await expect(store.importPendingFromBackup(initial.confirmed,packets)).rejects.toThrow();
    expect(await store.read()).toEqual(initial);
    const changed=structuredClone(initial.confirmed);
    changed.accounts[0]!.name='Adulterado';
    await expect(store.importPendingFromBackup(changed,[packets[0]!])).rejects.toThrow(/diverge/);
    expect(await store.read()).toEqual(initial);
  });
});
