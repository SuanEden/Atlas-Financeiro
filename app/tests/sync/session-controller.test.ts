import 'fake-indexeddb/auto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { RemoteController, type SourcePort } from '../../src/remote/controller';
import type { AuthIdentity, AuthPort } from '../../src/auth/supabase-adapter';
import { SyncFailure, type SyncTransport } from '../../src/sync/engine';
import { createTransactionCommand, createDefaultCommandContext } from '../../src/application';
import { sqlTestServer } from './sql-test-server';
import { recoveryFixture } from '../recovery-fixture';
import { calculateAvailabilityBalances } from '../../src/domain';

let server:Awaited<ReturnType<typeof sqlTestServer>>;
const controllers:RemoteController[]=[];
beforeAll(async()=>{server=await sqlTestServer();},30_000);
afterAll(async()=>{await server?.close();});
afterEach(()=>{controllers.splice(0).forEach((controller)=>controller.dispose());vi.restoreAllMocks();});
function storage():Storage {
  const values=new Map<string,string>();
  return {get length(){return values.size;},key:(index)=>[...values.keys()][index]??null,clear:()=>values.clear(),getItem:(key)=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);},removeItem:(key)=>{values.delete(key);}};
}
async function setup() {
  const owner=await server.user();const sourceOwner=crypto.randomUUID();const state=recoveryFixture(sourceOwner);const saved=storage();
  let identity:AuthIdentity={userId:owner,expiresAt:2000,writesEnabled:true};let failure:unknown;let notify:(userId?:string)=>void=()=>{};
  const auth:AuthPort={verify:vi.fn(async()=>{if(failure)throw failure;return identity;}),login:vi.fn(async()=>{}),logout:vi.fn(async()=>{}),callback:vi.fn(async()=>{}),onChange:(listener)=>{notify=listener;return ()=>{notify=()=>{};};}};
  const source:SourcePort={read:async()=>({ownerId:sourceOwner,state:structuredClone(state)})};
  const transport:SyncTransport={apply:(envelope)=>server.apply(owner,envelope),pull:(after,through)=>server.pull(owner,after,through)};
  const make=(port=transport)=>{const controller=new RemoteController('synthetic-controller',auth,port,saved,source,'test',()=>1000);controllers.push(controller);return controller;};
  const controller=make();await controller.start();
  return {owner,sourceOwner,state,saved,auth,source,transport,controller,make,fail:(reason:unknown)=>{failure=reason;},identity:(next:AuthIdentity)=>{identity=next;},notify:(userId?:string)=>notify(userId)};
}
async function associate(fixture:Awaited<ReturnType<typeof setup>>) {
  const preview=await fixture.controller.previewLocalSource();await fixture.controller.associateLocal(preview.digest);
  expect(fixture.controller.getSnapshot().session.canView).toBe(true);
}

describe('controlador local de sessão com SQL e identidades simuladas',()=>{
  it('associa explicitamente, preserva origem e continua gravando após expiração/reabertura offline',async()=>{
    const f=await setup();await associate(f);
    expect(f.state.accounts[0]!.userId).toBe(f.sourceOwner);
    const stored=await f.controller.getSnapshot().store!.read();expect(stored.meta).toMatchObject({binding:'active',sourceOwnerId:f.sourceOwner,sourceMode:'i2'});
    f.fail(new SyncFailure('offline','SYNTHETIC_OFFLINE'));f.controller.dispose();const reopened=f.make();await reopened.start();
    expect(reopened.getSnapshot().session).toMatchObject({canView:true,canWriteLocal:true,canTransmit:false});
    const command=createTransactionCommand({accountId:stored.projection.accounts[0]!.id,kind:'income',amountCents:1n,date:'2026-10-26',description:'Centavo sintético offline',realized:true},createDefaultCommandContext(f.owner));
    await reopened.enqueue(command);expect(await reopened.sync()).toBe('login_required');
    expect((await reopened.getSnapshot().store!.read()).pending).toHaveLength(1);
  });
  it('retoma associação depois de perder resposta e memória do controlador',async()=>{
    const f=await setup();f.controller.dispose();
    const lost=f.make({...f.transport,apply:async(envelope)=>{await f.transport.apply(envelope);throw new SyncFailure('offline','SYNTHETIC_LOST_RESPONSE');}});
    await lost.start();await lost.associateEmpty();expect(lost.getSnapshot().session.canView).toBe(false);
    const association=(await lost.getSnapshot().store!.read()).meta.associationId;lost.dispose();
    const reopened=f.make();await reopened.start();await reopened.sync();
    expect(reopened.getSnapshot().session.canView).toBe(true);
    expect((await reopened.getSnapshot().store!.read()).meta.associationId).toBe(association);
    expect(await server.counts(f.owner)).toMatchObject({sync_batches:'1',operation_receipts:'1'});
  });
  it('mudança na origem impede ativação depois do commit remoto',async()=>{
    const f=await setup();const preview=await f.controller.previewLocalSource();
    const apply=f.transport.apply;vi.spyOn(f.transport,'apply').mockImplementation(async(envelope)=>{
      const receipt=await apply(envelope);f.state.accounts[0]!.name='Origem sintética alterada';return receipt;
    });
    await f.controller.associateLocal(preview.digest);
    expect(f.controller.getSnapshot().session.canView).toBe(false);
    expect((await f.controller.getSnapshot().store!.read()).meta.binding).toBe('verifying_source');
  });
  it('logout offline bloqueia imediatamente, persiste e mantém pendência sem aceitar token/evento tardio',async()=>{
    const f=await setup();await associate(f);const store=f.controller.getSnapshot().store!;const initial=await store.read();
    await f.controller.enqueue(createTransactionCommand({accountId:initial.projection.accounts[0]!.id,kind:'income',amountCents:1n,date:'2026-10-26',description:'Pendente sintético',realized:true},createDefaultCommandContext(f.owner)));
    vi.mocked(f.auth.logout).mockRejectedValue(new Error('Synthetic offline signout'));
    const logout=f.controller.logout();expect(f.controller.getSnapshot().session.canView).toBe(false);await logout;
    f.notify(f.owner);await f.controller.verify();expect(f.controller.getSnapshot().session.canView).toBe(false);
    const reopened=f.make();await reopened.start();expect(reopened.getSnapshot().session.canView).toBe(false);
    expect((await store.read()).pending).toHaveLength(1);
    await reopened.verify(true);expect(reopened.getSnapshot().session.canView).toBe(true);
    expect((await reopened.getSnapshot().store!.read()).pending).toHaveLength(1);
  });
  it('resposta de verificação iniciada antes do logout não desbloqueia',async()=>{
    const f=await setup();await associate(f);
    let finish!:(identity:AuthIdentity)=>void;vi.mocked(f.auth.verify).mockImplementationOnce(()=>new Promise((resolve)=>{finish=resolve;}));
    const verification=f.controller.verify();await f.controller.logout();finish({userId:f.owner,expiresAt:2000,writesEnabled:true});await verification;
    expect(f.controller.getSnapshot().session).toMatchObject({canView:false,canTransmit:false});
  });
  it('conta diferente bloqueia a visão anterior e não herda associação',async()=>{
    const f=await setup();await associate(f);const previous=f.controller.getSnapshot().store!;const before=await previous.read();
    f.identity({userId:await server.user(),expiresAt:2000,writesEnabled:true});await f.controller.verify(true);
    expect(f.controller.getSnapshot().session.canView).toBe(false);
    expect(f.controller.getSnapshot().store!.userId).not.toBe(previous.userId);
    expect((await f.controller.getSnapshot().store!.read()).confirmed.accounts).toEqual([]);
    expect(calculateAvailabilityBalances(before.confirmed).totalCents).toBe(99802n);
  });
  it('readiness falso impede carga/envio, sem promover base sintética',async()=>{
    const f=await setup();f.identity({userId:f.owner,expiresAt:2000,writesEnabled:false});await f.controller.verify();
    await expect(f.controller.associateEmpty()).rejects.toThrow(/liberação/);
    expect((await f.controller.getSnapshot().store!.read()).meta.binding).toBe('unbound');
  });
  it('acesso revogado bloqueia visão e preserva namespace',async()=>{
    const f=await setup();await associate(f);const store=f.controller.getSnapshot().store!;
    f.fail(new SyncFailure('access_denied','SYNTHETIC_DENIED'));await f.controller.verify();
    expect(f.controller.getSnapshot().session.canView).toBe(false);expect((await store.read()).confirmed.accounts).toHaveLength(2);
  });
  it.each(['account-event','revoked'])('falha de armazenamento durante bloqueio %s também remove a visão publicada',async(mode)=>{
    const f=await setup();await associate(f);
    vi.spyOn(f.saved,'setItem').mockImplementation(()=>{throw new Error('Synthetic storage failure');});
    if(mode==='account-event')expect(()=>f.notify(crypto.randomUUID())).not.toThrow();
    else {f.fail(new SyncFailure('access_denied','SYNTHETIC_DENIED'));await f.controller.verify();}
    expect(f.controller.getSnapshot().session).toMatchObject({canView:false,canWriteLocal:false,canTransmit:false});
    expect((await f.controller.getSnapshot().store!.read()).confirmed.accounts).toHaveLength(2);
  });
});

describe('recuperação I3 não concede autenticação nem escrita remota',()=>{
  it('exige login, restaura no aparelho novo com gate falso e conserva bloqueio remoto',async()=>{
    const f=await setup();await associate(f);
    const {exportSyncBackup}=await import('../../src/sync/export-backup');
    const json=await exportSyncBackup(f.controller.getSnapshot().store!,'synthetic-controller');
    const identity={userId:f.owner,expiresAt:2000,writesEnabled:false};
    const auth:AuthPort={...f.auth,verify:async()=>identity};const saved=storage();
    const other=new RemoteController('synthetic-controller',auth,f.transport,saved,f.source,'new-device',()=>1000);controllers.push(other);
    await expect(other.recoverBackup(json)).rejects.toThrow(/Entre/);
    await other.start();await other.recoverBackup(json);
    expect(other.getSnapshot().session).toMatchObject({canView:true,canTransmit:false,onlineVerified:true});
    expect((await other.getSnapshot().store!.read()).projection).toEqual((await f.controller.getSnapshot().store!.read()).projection);
    await other.logout();await expect(other.recoverBackup(json)).rejects.toThrow(/Entre/);
    expect(other.getSnapshot().session.canView).toBe(false);
  });
});
