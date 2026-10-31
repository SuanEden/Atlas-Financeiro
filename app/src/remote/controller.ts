import type { LocalCommand } from '../application';
import { SessionPolicy, type SessionView } from '../auth/session-policy';
import type { AuthPort } from '../auth/supabase-adapter';
import type { AuthReturn } from '../auth/callback';
import { SyncEngine, SyncFailure, type SyncResult, type SyncTransport } from '../sync/engine';
import { LocalSyncStore } from '../sync/local-sync-store';
import { commandEnvelope, isI3SchemaCompatible, prepareBootstrap, type BootstrapEnvelope } from '../sync/protocol';
import { canonicalLocalState } from '../backup/validate-i2-backup';
import { jsonDigest } from '../sync/protocol';
import type { LocalFinancialState } from '../domain';

export interface SourcePort {read():Promise<{ownerId:string;state:LocalFinancialState}>}
export interface RemoteSnapshot {session:SessionView;loading:boolean;dataRevision:number;notice:string;syncing:boolean;store:LocalSyncStore|undefined}

export class RemoteController {
  readonly policy:SessionPolicy;
  #snapshot:RemoteSnapshot;
  #listeners=new Set<()=>void>();
  #store:LocalSyncStore|undefined;
  #engine:SyncEngine|undefined;
  #initialize:Promise<void>|undefined;
  #verification:Promise<void>|undefined;
  #generation=0;
  #syncing:Promise<SyncResult>|undefined;
  #disposed=false;
  #recovering=false;
  readonly #unsubscribeAuth:()=>void;
  constructor(readonly serverId:string,private readonly auth:AuthPort,private readonly transport:SyncTransport,storage:Storage,private readonly source:SourcePort,private readonly deviceNamespace='default',private readonly now=()=>Date.now()) {
    this.policy=new SessionPolicy(serverId,storage,now);
    this.#snapshot={session:this.policy.snapshot,loading:true,dataRevision:0,notice:'',syncing:false,store:undefined};
    this.#unsubscribeAuth=auth.onChange((userId)=>{
      if(this.#disposed||this.policy.snapshot.blocked)return;
      this.#generation++;
      // SDK events invalidate transmission immediately; they never authenticate by themselves.
      try {
        if(userId&&this.policy.snapshot.userId&&userId!==this.policy.snapshot.userId)this.policy.lock();
        else this.policy.expire();
      } catch { /* Persistence errors still leave the in-memory policy locked. */ }
      this.publish({});
      if(!this.policy.snapshot.blocked)void this.verify(false);
    });
  }
  getSnapshot=()=>this.#snapshot;
  subscribe=(listener:()=>void)=>{this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};};
  start(authReturn:AuthReturn={kind:'none'}):Promise<void> {
    if(this.#initialize) return this.#initialize;
    this.#initialize=(async()=>{
      try {
        if(authReturn.kind==='error') {this.policy.lock();this.publish({notice:'O retorno do Google não pôde ser validado. Entre novamente.'});return;}
        if(authReturn.kind==='code') {await this.auth.callback(authReturn.code);await this.verify(true);}
        else await this.verify(false);
      } catch {this.policy.expire();this.publish({notice:'Não foi possível confirmar o login. Seus registros locais foram preservados.'});}
      finally {await this.openStore();this.publish({loading:false});}
    })();return this.#initialize;
  }
  async login() {this.publish({notice:''});try {await this.auth.login();}catch{this.publish({notice:'Não foi possível abrir o Google. Confira a conexão e tente novamente.'});}}
  async verify(interactive=false):Promise<void> {
    const generation=++this.#generation;
    this.policy.expire();this.publish({});
    const run=(async()=>{
      try {
        // A durable explicit logout cannot be undone by a cached SDK token/event.
        if(!interactive&&this.policy.snapshot.blocked) return;
        const identity=await this.auth.verify();
        if(generation!==this.#generation) return;
        this.policy.verify(identity.userId,identity.expiresAt,identity.writesEnabled,interactive);
        await this.openStore();
        const store=this.#store;
        const state=await store?.read();
        if(generation!==this.#generation||store!==this.#store)return;
        if(state?.meta.binding==='active') this.policy.markAssociated(identity.userId);
        this.publish({notice:identity.writesEnabled?'':'Login verificado. O envio remoto aguarda liberação.'});
      } catch(reason) {
        if(generation!==this.#generation) return;
        if(reason instanceof SyncFailure&&reason.reason==='access_denied') {try {this.policy.deny();}catch { /* Publish the closed policy even if storage fails. */ }}else this.policy.expire();
        this.publish({notice:reason instanceof SyncFailure&&reason.reason==='access_denied'?'Esta conta não tem acesso liberado.':'Entre novamente para sincronizar. Os dados locais continuam preservados.'});
      }
    })();
    this.#verification=run;try {await run;}finally {if(this.#verification===run)this.#verification=undefined;}
  }
  async logout() {
    this.#generation++;
    try {this.policy.lock();}catch { /* Policy fails closed even when persistence fails. */ }
    this.publish({notice:'Acesso local bloqueado. As pendências foram preservadas.'});
    try {await this.auth.logout();}catch {this.publish({notice:'Acesso local bloqueado. A saída no servidor depende de conexão; suas pendências foram preservadas.'});}
  }
  storageChanged() {this.#generation++;this.policy.reloadFromStorage();this.publish({notice:'A sessão mudou em outra aba. Entre novamente para sincronizar.'});}
  expireIfNeeded() {if(this.policy.snapshot.expiresAt>0&&!this.policy.snapshot.onlineVerified){this.policy.expire();this.publish({});}}

  async previewLocalSource() {
    this.requireOnline();const epoch=this.policy.snapshot.epoch;const source=await this.source.read();
    const digest=await jsonDigest(JSON.parse(canonicalLocalState(source.state,source.ownerId)));
    if(epoch!==this.policy.snapshot.epoch)throw new Error('A sessão mudou durante a conferência.');
    return {ownerId:source.ownerId,accounts:source.state.accounts.length,events:source.state.events.length,pending:source.state.outbox.length,digest};
  }
  async associateEmpty() {
    this.requireOnline();
    const ownerId=crypto.randomUUID();const state:LocalFinancialState={accounts:[],categories:[],events:[],settlements:[],postings:[],outbox:[]};
    await this.prepareAndSend(state,ownerId,'empty');
  }
  async associateLocal(expectedDigest:string) {
    this.requireOnline();const epoch=this.policy.snapshot.epoch;const source=await this.source.read();
    if(await jsonDigest(JSON.parse(canonicalLocalState(source.state,source.ownerId)))!==expectedDigest) throw new Error('A base local mudou. Faça uma nova conferência antes de associar.');
    if(epoch!==this.policy.snapshot.epoch)throw new Error('A sessão mudou durante a conferência.');
    await this.prepareAndSend(source.state,source.ownerId,'i2');
  }
  async joinExisting() {
    this.requireOnline();await this.#store!.prepareJoin();await this.sync();
  }
  async sync():Promise<SyncResult> {
    if(this.#recovering) return 'retry_later';
    if(this.#syncing) return this.#syncing;
    this.#syncing=(async()=>{
      if(!this.policy.snapshot.canTransmit||!this.#engine)return 'login_required';
      const epoch=this.policy.snapshot.epoch;const store=this.#store!;
      this.publish({syncing:true,notice:''});
      try {
        const result=await this.#engine.run();
        if(this.policy.snapshot.epoch!==epoch||store!==this.#store)return 'login_required';
        const state=await store.read();
        if(state.meta.binding==='verifying_source') {
          const receipt=state.receipts.find((row)=>row.operationId===state.meta.associationId);
          if(!receipt) throw new Error('Confirmação da associação ausente.');
          // Source metadata is persisted; a reload may resume without any in-memory proposal.
          const sourceOwner=state.meta.sourceOwnerId;
          let digest:string;
          if(state.meta.sourceMode==='empty'&&sourceOwner) digest=await jsonDigest(JSON.parse(canonicalLocalState({accounts:[],categories:[],events:[],settlements:[],postings:[],outbox:[]},sourceOwner)));
          else {const source=await this.source.read();if(source.ownerId!==sourceOwner) throw new Error('A origem ativa mudou.');digest=await jsonDigest(JSON.parse(canonicalLocalState(source.state,source.ownerId)));}
          if(!this.policy.snapshot.onlineVerified||this.policy.snapshot.epoch!==epoch) return 'login_required';
          await store.activateAssociation(digest);
        }
        const active=(await store.read()).meta.binding==='active';
        if(this.policy.snapshot.epoch!==epoch||store!==this.#store)return 'login_required';
        if(active&&this.policy.snapshot.onlineVerified)this.policy.markAssociated(store.userId);
        if(result==='login_required')this.policy.expire();
        if(result==='access_denied')this.policy.deny();
        const latestState=await store.read();
        const incompatiblePending=latestState.pending.some((row)=>row.status==='pending'&&!isI3SchemaCompatible(row.envelope));
        const notice=incompatiblePending?'A cópia local contém recorrências ou conciliações ainda não suportadas pelo esquema remoto. A sincronização permanece pendente até uma migração versionada do servidor; não considere estes dados replicados. A cópia local e as pendências continuam preservadas.':syncMessage(result,latestState.meta.binding==='active');
        this.publish({dataRevision:this.#snapshot.dataRevision+1,notice});
        return result;
      } catch {this.publish({notice:'A sincronização precisa de conferência. Os registros, a origem e as pendências foram preservados.'});return 'retry_later';}
      finally {this.publish({syncing:false});}
    })().finally(()=>{this.#syncing=undefined;});return this.#syncing;
  }
  async enqueue(command:LocalCommand) {
    // A recovery must own the local dataset exclusively until its transaction settles.
    if(this.#recovering) throw new Error('Aguarde a recuperação da cópia antes de registrar.');
    if(!this.policy.snapshot.canWriteLocal||command.operation.userId!==this.policy.snapshot.userId||!this.#store) throw new Error('Entre com a conta correta antes de registrar.');
    const store=this.#store;const epoch=this.policy.snapshot.epoch;const state=await store.read();
    if(epoch!==this.policy.snapshot.epoch||!this.policy.snapshot.canWriteLocal) throw new Error('A sessão mudou. Seus dados anteriores foram preservados.');
    await store.enqueue(commandEnvelope(command.operation,state.meta.cursor));
    if(epoch===this.policy.snapshot.epoch)this.publish({dataRevision:this.#snapshot.dataRevision+1});
  }
  async recoverBackup(json: string) {
    if (this.#syncing || this.#recovering) throw new Error('Aguarde a operação em andamento antes de recuperar.');
    const session = this.policy.snapshot; const store = this.#store;
    if (!session.onlineVerified || session.blocked || !store || store.userId !== session.userId)
      throw new Error('Entre com a mesma conta Google antes de recuperar a cópia.');
    const authorized = () => { const current = this.policy.snapshot; return current.onlineVerified && !current.blocked
      && current.userId === store.userId && current.epoch === session.epoch && store === this.#store; };
    this.#recovering = true;
    try {
    // Coordinate recovery with foreground sync in other tabs of the same namespace.
    // Never restore while another tab may be transmitting the previous local state.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      await navigator.locks.request(`atlas-financeiro:sync:${store.name}`, async () => {
        if (!authorized()) throw new Error('A sessão mudou antes da recuperação.');
        await store.recoverBackup(json, authorized);
      });
    } else {
      await store.recoverBackup(json, authorized);
    }
    if (!authorized()) throw new Error('A sessão mudou. Entre novamente; os dados recuperados foram preservados.');
    const state = await store.read();
    if (state.meta.binding === 'active') this.policy.markAssociated(store.userId);
    this.publish({dataRevision: this.#snapshot.dataRevision + 1,
      notice: 'Cópia recuperada localmente. Nenhuma operação foi enviada; confira os dados antes de sincronizar.'});
    } finally { this.#recovering = false; }
  }

  async acceptRemoteConflict(id:string) {
    if(!this.policy.snapshot.canView||!this.#store)throw new Error('Entre novamente antes de revisar conflitos.');
    await this.#store.resolveConflict(id);this.publish({dataRevision:this.#snapshot.dataRevision+1});
  }
  dispose() {this.#disposed=true;this.#generation++;this.#unsubscribeAuth();this.#store?.close();this.#listeners.clear();}

  private requireOnline() {if(!this.policy.snapshot.onlineVerified||!this.policy.snapshot.canTransmit||!this.#store)throw new Error('Conclua o login e aguarde a liberação do envio antes de associar.');}
  private async prepareAndSend(state:LocalFinancialState,sourceOwner:string,mode:'empty'|'i2') {
    const store=this.#store!;const epoch=this.policy.snapshot.epoch;
    const envelope=await prepareBootstrap(state,sourceOwner,store.userId,crypto.randomUUID());
    if(epoch!==this.policy.snapshot.epoch) throw new Error('A sessão mudou durante a conferência.');
    await store.prepareAssociation(envelope,mode);
    await this.sync();
  }
  private async openStore() {
    const owner=this.policy.snapshot.userId;if(!owner)return;
    if(this.#store?.userId!==owner) {
      const previous=this.#store;this.#store=new LocalSyncStore(owner,this.serverId,this.deviceNamespace);
      this.#engine=new SyncEngine(this.#store,this.transport,()=>this.policy.snapshot);
      // Old handles are closed only after their pending IDB transaction can settle; namespaces remain on disk.
      previous?.close();
    }
    this.publish({});
  }
  private publish(patch:Partial<RemoteSnapshot>) {
    this.#snapshot={...this.#snapshot,...patch,session:this.policy.snapshot,store:this.#store};
    for(const listener of this.#listeners)listener();
  }
}

function syncMessage(result:SyncResult,active:boolean):string {
  return result==='synced'||(result==='unassociated'&&active)?'Alterações confirmadas até a última revisão recebida.':{
    offline:'Sem conexão. Os registros locais e as pendências foram preservados.',login_required:'Entre novamente antes de sincronizar.',access_denied:'O acesso remoto foi bloqueado. Dados locais preservados.',quota:'O serviço atingiu um limite. As pendências foram preservadas; não ative plano pago.',retry_later:'Não foi possível confirmar tudo. Tente novamente mais tarde.',conflict:'Há alterações para revisar antes de continuar.',unassociated:'A associação inicial ainda não foi concluída.',synced:'',
  }[result];
}
