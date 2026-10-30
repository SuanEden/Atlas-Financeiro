import type { ChangePage, Receipt, SyncEnvelope } from './protocol';
import { jsonDigest } from './protocol';
import { LocalSyncStore } from './local-sync-store';

export interface TransmissionGrant { userId: string; epoch: number; canTransmit: boolean }
export interface SyncTransport {
  apply(envelope: SyncEnvelope): Promise<Receipt>;
  pull(after: string, through: string | null): Promise<ChangePage>;
}
export type SyncResult = 'synced'|'offline'|'login_required'|'access_denied'|'quota'|'retry_later'|'conflict'|'unassociated';
export class SyncFailure extends Error {
  constructor(readonly reason: Exclude<SyncResult,'synced'|'unassociated'>, readonly code: string) { super(code); }
}

/** A bounded foreground round only. No background/closed-app delivery promise. */
export class SyncEngine {
  #running: Promise<SyncResult>|undefined;
  constructor(readonly store: LocalSyncStore, private readonly transport: SyncTransport, private readonly getGrant: ()=>TransmissionGrant, private readonly online=()=>typeof navigator==='undefined'||navigator.onLine!==false) {}
  run(): Promise<SyncResult> {
    if(this.#running) return this.#running;
    this.#running=this.runOnce().finally(()=>{this.#running=undefined;}); return this.#running;
  }
  private async runOnce(): Promise<SyncResult> {
    const grant=this.getGrant();
    const current=()=>{const now=this.getGrant();return now.canTransmit&&now.epoch===grant.epoch&&now.userId===grant.userId&&now.userId===this.store.userId;};
    if(!this.online()) return 'offline';
    if(!current()) return 'login_required';
    const work=async():Promise<SyncResult>=>{
      try {
        let state=await this.store.read();
        if(state.meta.binding==='unbound') return 'unassociated';
        // A persisted envelope may come from another app version. Never send changed bytes
        // under an existing operation ID/digest, or reinterpret an unsupported local record.
        for(const row of state.pending) {
          if(await jsonDigest(row.envelope)!==row.digest||(row.operationDigest!==undefined&&(row.envelope.kind==='bootstrap'||await jsonDigest(row.envelope.operation)!==row.operationDigest))) throw new TypeError('Pendência divergente da cópia original.');
          if(row.status==='pending'&&!isI3SchemaCompatible(row.envelope)) return 'retry_later';
        }
        // Pull first: dependencies/conflicts are evaluated against the latest confirmed graph.
        let through:string|null=null;
        for(let pageCount=0;pageCount<100;pageCount++) {
          if(!current()) return 'login_required';
          const page=await this.transport.pull(state.meta.cursor,through);
          if(!current()) return 'login_required';
          if(through!==null&&page.through!==through) throw new TypeError('O limite da leitura mudou durante a paginação.');
          await this.store.applyPage(page);
          through=page.through; state=await this.store.read();
          if(page.cursor===through) break;
          if(pageCount===99) return 'retry_later';
        }
        if(state.meta.binding==='join'&&through!==null) { if(through==='0') return 'unassociated'; if(!current()) return 'login_required'; await this.store.activateJoin(through); }
        for(const delivery of state.pending.filter((row)=>row.status==='pending').slice(0,50)) {
          if(!current()) return 'login_required';
          const pending=(await this.store.read()).pending.find((row)=>row.id===delivery.id);
          if(pending?.status!=='pending') continue;
          if(pending.digest!==delivery.digest||await jsonDigest(pending.envelope)!==pending.digest) throw new TypeError('A pendência mudou antes do envio.');
          if(!current()) return 'login_required';
          try {
            const receipt=await this.transport.apply(pending.envelope);
            if(!current()) return 'login_required';
            await this.store.acknowledge(delivery.id,receipt);
          } catch(reason) {
            if(!current()) return 'login_required';
            if(reason instanceof SyncFailure&&reason.reason==='conflict') { await this.store.markConflict(delivery.id,reason.code); continue; }
            throw reason;
          }
        }
        // Never advance the cursor from an acknowledgement alone.
        state=await this.store.read(); through=null;
        for(let pageCount=0;pageCount<100;pageCount++) {
          if(!current()) return 'login_required';
          const page=await this.transport.pull(state.meta.cursor,through);
          if(!current()) return 'login_required';
          if(through!==null&&page.through!==through) throw new TypeError('O limite da leitura mudou durante a paginação.');
          await this.store.applyPage(page); through=page.through; state=await this.store.read();
          if(page.cursor===through) break;
          if(pageCount===99) return 'retry_later';
        }
        return state.pending.some((row)=>['conflict','blocked'].includes(row.status))?'conflict':state.meta.binding!=='active'?'unassociated':state.pending.some((row)=>row.status!=='resolved')?'retry_later':'synced';
      } catch(reason) { return reason instanceof SyncFailure?reason.reason:'retry_later'; }
    };
    if(typeof navigator!=='undefined'&&navigator.locks) return navigator.locks.request(`atlas-financeiro:sync:${this.store.name}`,work);
    // Server idempotency remains mandatory even when this tab cannot obtain a cross-tab lock.
    return work();
  }
}
