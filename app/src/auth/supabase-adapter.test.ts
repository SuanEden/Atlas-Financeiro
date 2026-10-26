import { describe, expect, it, vi } from 'vitest';
import { adapterFromClient, mapRemoteError, readRemoteConfig } from './supabase-adapter';
import { consumeAuthReturn } from './callback';

function sdk() {
  const user={id:crypto.randomUUID(),is_anonymous:false,identities:[{provider:'google'}]};
  const rpc=vi.fn(async()=>({data:{protocolVersion:1,financialWritesEnabled:false},error:null}));
  const client={schema:vi.fn(()=>({rpc})),auth:{
    getUser:vi.fn(async()=>({data:{user},error:null})),
    getSession:vi.fn(async()=>({data:{session:{user,expires_at:2000}},error:null})),
    signInWithOAuth:vi.fn(async()=>({error:null})),exchangeCodeForSession:vi.fn(async()=>({error:null})),signOut:vi.fn(async()=>({error:null})),
    onAuthStateChange:vi.fn(()=>({data:{subscription:{unsubscribe:vi.fn()}}})),
  }};
  const clear=vi.fn();const adapter=adapterFromClient(client as unknown as Parameters<typeof adapterFromClient>[0],'http://127.0.0.1:5173',clear);
  return {client,user,rpc,clear,...adapter};
}
describe('fronteira Auth local sem acesso a serviços',()=>{
  it('modo remoto precisa ser explícito; não aceita chave administrativa ou origem divergente',()=>{
    expect(readRemoteConfig({})).toBeUndefined();
    expect(readRemoteConfig({VITE_ATLAS_REMOTE_MODE:'disabled'})).toBeUndefined();
    const env={VITE_ATLAS_REMOTE_MODE:'integration',VITE_SUPABASE_URL:'https://synthetic.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic123456'};
    expect(readRemoteConfig(env)?.serverId).toBe('synthetic.supabase.co');
    for(const url of ['http://synthetic.supabase.co','https://synthetic.supabase.co/other','https://synthetic.supabase.co.evil.test','https://user@synthetic.supabase.co'])expect(()=>readRemoteConfig({...env,VITE_SUPABASE_URL:url})).toThrow();
    expect(()=>readRemoteConfig({...env,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_secret_synthetic123456'})).toThrow(/publicável/);
  });
  it('verifica usuário no servidor, identidade Google e readiness antes de conceder sessão',async()=>{
    const f=sdk();expect(await f.auth.verify()).toEqual({userId:f.user.id,expiresAt:2000000,writesEnabled:false});
    expect(f.client.auth.getUser).toHaveBeenCalledOnce();expect(f.rpc).toHaveBeenCalledWith('i3_readiness',{});
    f.user.identities=[];await expect(f.auth.verify()).rejects.toMatchObject({reason:'access_denied'});
  });
  it('sessão que troca de proprietário durante verificação é recusada',async()=>{
    const f=sdk();f.client.auth.getSession.mockResolvedValue({data:{session:{user:{...f.user,id:crypto.randomUUID()},expires_at:2000}},error:null});
    await expect(f.auth.verify()).rejects.toMatchObject({reason:'login_required'});
  });
  it('login usa somente Google e callback exato; falha de signout ainda limpa sessão local',async()=>{
    const f=sdk();await f.auth.login();
    expect(f.client.auth.signInWithOAuth).toHaveBeenCalledWith({provider:'google',options:{redirectTo:'http://127.0.0.1:5173/auth/callback',queryParams:{prompt:'select_account'}}});
    f.client.auth.signOut.mockRejectedValue(new Error('Synthetic offline'));await expect(f.auth.logout()).rejects.toThrow();expect(f.clear).toHaveBeenCalledOnce();
    expect(f.client.auth.signOut).toHaveBeenCalledWith({scope:'local'});
  });
  it('retorno é consumido uma vez e URL limpa antes de qualquer troca assíncrona',()=>{
    const replace=vi.fn();expect(consumeAuthReturn('https://synthetic.test/auth/callback?code=synthetic',replace)).toEqual({kind:'code',code:'synthetic'});expect(replace).toHaveBeenCalledWith('/');
    for(const path of ['?code=a&code=b','?error=cancelled','?code=a#access_token=synthetic',''])expect(consumeAuthReturn(`https://synthetic.test/auth/callback${path}`,replace)).toEqual({kind:'error'});
    expect(consumeAuthReturn('https://synthetic.test/',replace)).toEqual({kind:'none'});
  });
  it.each([[401,'login_required'],[403,'access_denied'],[409,'conflict'],[402,'quota'],[429,'quota'],[503,'retry_later'],[0,'offline']] as const)('erro %i é sanitizado e preserva significado %s',(status,reason)=>{
    const error=mapRemoteError({status,message:'synthetic private payload must stay hidden'});
    expect(error.reason).toBe(reason);expect(error.message).not.toContain('payload');
  });
});
