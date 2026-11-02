import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertEntityId } from '../domain';
import { SyncFailure, type SyncTransport } from '../sync/engine';
import type { ChangePage, Receipt, SyncEnvelope } from '../sync/protocol';
import { assertEnvelope } from '../sync/protocol';

export interface AuthIdentity { userId:string; expiresAt:number; writesEnabled:boolean }
export interface AuthPort {
  verify():Promise<AuthIdentity>;
  verifyBankLogin?():Promise<boolean>;
  login():Promise<void>;
  logout():Promise<void>;
  callback(code:string):Promise<void>;
  onChange(callback:(userId?:string)=>void):()=>void;
  readBank?(resource:'item'|'accounts'|'transactions'|'balance', id?:string, after?:string):Promise<unknown>;
}
export interface RemoteConfig { url:string; publishableKey:string; serverId:string }

export function readRemoteConfig(env:Record<string,unknown>):RemoteConfig|undefined {
  const mode=env.VITE_ATLAS_REMOTE_MODE;
  if(mode===undefined||mode===''||mode==='disabled') return undefined;
  if(mode!=='integration') throw new Error('Modo remoto não reconhecido; os dados não foram abertos.');
  const url=typeof env.VITE_SUPABASE_URL==='string'?env.VITE_SUPABASE_URL:'';
  const key=typeof env.VITE_SUPABASE_PUBLISHABLE_KEY==='string'?env.VITE_SUPABASE_PUBLISHABLE_KEY:'';
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||!/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname)||parsed.pathname!=='/'||parsed.search||parsed.hash||parsed.username||parsed.password||parsed.port) throw new Error('URL Supabase inválida; use o endereço HTTPS do projeto aprovado.');
  if(!/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key)) throw new Error('Use somente a chave publicável. Chaves secretas/administrativas são proibidas no aplicativo.');
  return {url:parsed.origin,publishableKey:key,serverId:parsed.hostname};
}

export function createSupabaseAdapter(config:RemoteConfig,origin:string,storage:Storage=localStorage) {
  const key=`atlas-financeiro:supabase:v1:${config.serverId}`;
  const sessionStorage={getItem:(name:string)=>storage.getItem(name),removeItem:(name:string)=>storage.removeItem(name),setItem:(name:string,value:string)=>{
    if(name===key) {
      const session=JSON.parse(value) as Record<string,unknown>;delete session.provider_token;delete session.provider_refresh_token;
      storage.setItem(name,JSON.stringify(session));
    } else storage.setItem(name,value);
  }};
  const client=createClient(config.url,config.publishableKey,{db:{schema:'api'},auth:{flowType:'pkce',detectSessionInUrl:false,persistSession:true,autoRefreshToken:true,storage:sessionStorage,storageKey:key},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});
  return adapterFromClient(client,origin,()=>{storage.removeItem(key);storage.removeItem(`${key}-code-verifier`);});
}

type ApiClient = SupabaseClient<any, 'public', 'api'>;
export function adapterFromClient(client:ApiClient,origin:string,clearLocalSession=()=>{}):{auth:AuthPort;transport:SyncTransport} {
  const callbackUrl=new URL('/auth/callback',origin).href;
  const rpc=async<T>(name:string,args:Record<string,unknown>={})=>{
    const {data,error}=await client.schema('api').rpc(name,args);
    if(error) throw mapRemoteError(error);
    return data as T;
  };
  const auth:AuthPort={
    async verifyBankLogin() {
      const {data,error}=await client.auth.getUser();
      const isGoogle=!error && Boolean(data.user && !data.user.is_anonymous && data.user.identities?.some(identity=>identity.provider==='google'));
      if(!isGoogle)return false;
      const {data:session,error:sessionError}=await client.auth.getSession();
      if(sessionError || !session.session?.access_token)return false;
      try{
        const verified=await fetch('/api/pluggy?resource=session',{
          headers:{Authorization:'Bearer '+session.session.access_token},cache:'no-store',
        });
        return verified.ok;
      }catch{return false;}
    },
    async verify() {
      const {data,error}=await client.auth.getUser();
      if(error||!data.user) throw error?mapRemoteError(error):new SyncFailure('login_required','NO_SESSION');
      const user=data.user;
      assertEntityId(user.id);
      if(user.is_anonymous||!user.identities?.some((identity)=>identity.provider==='google')) throw new SyncFailure('access_denied','GOOGLE_IDENTITY_REQUIRED');
      const readiness=await rpc<{protocolVersion:number;financialWritesEnabled:boolean}>('i3_readiness');
      if(readiness.protocolVersion!==1||typeof readiness.financialWritesEnabled!=='boolean') throw new SyncFailure('access_denied','UNSUPPORTED_SERVER');
      const session=await client.auth.getSession();
      if(session.error||!session.data.session||session.data.session.user.id!==user.id||!session.data.session.expires_at) throw new SyncFailure('login_required','SESSION_CHANGED');
      return {userId:user.id,expiresAt:session.data.session.expires_at*1000,writesEnabled:readiness.financialWritesEnabled};
    },
    async login() {
      const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callbackUrl,queryParams:{prompt:'select_account'}}});
      if(error) throw mapRemoteError(error);
    },
    async callback(code) { const {error}=await client.auth.exchangeCodeForSession(code);if(error) throw mapRemoteError(error); },
    async readBank(resource, id, after) {
      const session=await client.auth.getSession();
      const token=session.data.session?.access_token;
      if(session.error||!token) throw new SyncFailure('login_required','NO_SESSION');
      const query=new URLSearchParams({resource});
      if(resource==='item'&&id)query.set('itemId',id);
      if(resource==='accounts'&&id)query.set('itemId',id);
      if(resource==='transactions'&&id)query.set('accountId',id);
      if(resource==='transactions'&&after)query.set('after',after);
      if(resource==='balance'&&id)query.set('accountId',id);
      const response=await fetch('/api/pluggy?'+query.toString(),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
      if(!response.ok){
        let upstream: number|undefined;
        try{
          const body=await response.json() as {upstreamStatus?:number};
          if(typeof body.upstreamStatus==='number')upstream=body.upstreamStatus;
        }catch{/* Error body may be unavailable. */}
        if(response.status===403)throw new Error('A sessão Google não está autorizada a consultar os bancos (HTTP 403).');
        if(response.status===502 && upstream===403)throw new Error('A Pluggy recusou acesso à conexão (403). Confira se ela pertence ao mesmo aplicativo Pluggy.');
        if(response.status===502 && upstream===404)throw new Error('A conexão não foi encontrada na Pluggy (404).');
        if(response.status===502 && upstream===429)throw new Error('A Pluggy limitou consultas. Aguarde a próxima atualização (429).');
        throw new Error('Consulta bancária indisponível (HTTP '+response.status+(upstream?' / Pluggy '+upstream:'')+').');
      }
      return response.json();
    },
    async logout() {try {const {error}=await client.auth.signOut({scope:'local'});if(error) throw mapRemoteError(error);}finally {clearLocalSession();}},
    onChange(callback) {const {data}=client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>callback(session?.user.id),0);});return ()=>data.subscription.unsubscribe();},
  };
  return {auth,transport:{apply:async(envelope:SyncEnvelope)=>{assertEnvelope(envelope);return rpc<Receipt>('i3_apply',{p_envelope:envelope});},pull:(after:string,through:string|null)=>rpc<ChangePage>('i3_pull',{p_after:after,p_through:through,p_limit:10})}};
}

/** Never expose raw PostgreSQL/Auth messages (which can contain submitted data or URLs). */
export function mapRemoteError(error:{code?:string|undefined;status?:number|undefined;message?:string|undefined;name?:string|undefined}):SyncFailure {
  const code=error.code??'';const status=error.status??0;
  if(status===401||error.name==='AuthSessionMissingError'||['PGRST301','PGRST302','bad_jwt','session_not_found','refresh_token_not_found','refresh_token_already_used'].includes(code)) return new SyncFailure('login_required','AUTHENTICATE_AGAIN');
  if(status===403||code==='42501') return new SyncFailure('access_denied','REMOTE_ACCESS_BLOCKED');
  if(status===402||status===429||code==='PGRST003'||code==='53300') return new SyncFailure('quota','REMOTE_LIMIT');
  if(status===409||['23505','23514','23503','22023'].includes(code)) return new SyncFailure('conflict',code==='22023'?'INVALID_OR_REUSED_OPERATION':'CONCURRENT_FINANCIAL_CHANGE');
  if(status>=500) return new SyncFailure('retry_later','SERVER_UNAVAILABLE');
  return new SyncFailure('offline','CONNECTION_NOT_CONFIRMED');
}
