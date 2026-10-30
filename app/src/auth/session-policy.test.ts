import { describe, expect, it, vi } from 'vitest';
import { SessionPolicy } from './session-policy';

function memoryStorage() {
  const values=new Map<string,string>();
  return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
}
const owner=()=>crypto.randomUUID();

describe('acesso local associado e sessão para transmissão',()=>{
  it('expiração e recarga offline preservam visão e escrita, sem transmitir',()=>{
    let now=1000;const storage=memoryStorage();const user=owner();const policy=new SessionPolicy('synthetic',storage,()=>now);
    policy.verify(user,2000,true);expect(policy.snapshot.canView).toBe(false);
    policy.markAssociated(user);expect(policy.snapshot.canTransmit).toBe(true);
    now=2000;
    expect(policy.snapshot).toMatchObject({canView:true,canWriteLocal:true,canTransmit:false});
    expect(new SessionPolicy('synthetic',storage,()=>now).snapshot).toMatchObject({userId:user,canView:true,canWriteLocal:true,canTransmit:false});
    expect(JSON.stringify([...Object.values(storage)])).not.toContain('token');
  });
  it('logout persiste bloqueio; token/evento automático não reabre a visão',()=>{
    const storage=memoryStorage();const user=owner();const policy=new SessionPolicy('synthetic',storage,()=>1000);
    policy.verify(user,2000,true);policy.markAssociated(user);policy.lock();
    const reopened=new SessionPolicy('synthetic',storage,()=>1000);
    expect(reopened.snapshot).toMatchObject({blocked:true,canView:false,canTransmit:false});
    expect(()=>reopened.verify(user,2000,true)).toThrow(/novo login/);
    reopened.verify(user,2000,true,true);expect(reopened.snapshot.canView).toBe(true);
  });
  it('outra conta não herda associação; readiness falso impede envio',()=>{
    const policy=new SessionPolicy('synthetic',memoryStorage(),()=>1000);const user=owner();
    policy.verify(user,2000,true);policy.markAssociated(user);
    policy.verify(owner(),2000,false);
    expect(policy.snapshot).toMatchObject({canView:false,canWriteLocal:false,canTransmit:false});
    expect(()=>policy.markAssociated(user)).toThrow(/mesma identidade/);
  });
  it('logout em outra aba invalida concessão e corrupção falha fechada',()=>{
    const storage=memoryStorage();const user=owner();const first=new SessionPolicy('synthetic',storage,()=>1000);
    first.verify(user,2000,true);first.markAssociated(user);
    const second=new SessionPolicy('synthetic',storage,()=>1000);second.lock();first.reloadFromStorage();
    expect(first.snapshot).toMatchObject({canView:false,canTransmit:false});
    storage.setItem(first.storageKey,JSON.stringify({version:1,userId:user,associated:'true',blocked:false}));
    first.reloadFromStorage();expect(first.snapshot.canView).toBe(false);
  });
  it('falha de armazenamento bloqueia memória e remove concessão antiga quando possível',()=>{
    const storage=memoryStorage();const policy=new SessionPolicy('synthetic',storage,()=>1000);const user=owner();
    policy.verify(user,2000,true);policy.markAssociated(user);
    vi.spyOn(storage,'setItem').mockImplementation(()=>{throw new Error('Synthetic storage failure');});
    expect(()=>policy.lock()).toThrow(/preservar o acesso/);
    expect(policy.snapshot).toMatchObject({canView:false,canTransmit:false});
    expect(new SessionPolicy('synthetic',storage,()=>1000).snapshot.canView).toBe(false);
  });
});
