import { assertEntityId } from '../domain';
import type { TransmissionGrant } from '../sync/engine';

interface SavedAccess { version:1; userId:string; associated:boolean; blocked:boolean }
export interface SessionView extends TransmissionGrant {
  canView:boolean; canWriteLocal:boolean; onlineVerified:boolean; expiresAt:number; message:string;
}

/** UX lock for a personal profile, not encryption or protection against developer tools. No tokens here. */
export class SessionPolicy {
  #saved:SavedAccess|undefined;
  #epoch=0;
  #verified=false;
  #expiresAt=0;
  #writesEnabled=false;
  readonly storageKey:string;
  constructor(context:string,private readonly storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>,private readonly now=()=>Date.now()) {
    if(!/^[a-z0-9.-]{1,100}$/.test(context)) throw new TypeError('Contexto de acesso inválido.');
    this.storageKey=`atlas-financeiro:access:v1:${context}`;
    try {
      const raw=storage.getItem(this.storageKey);
      if(raw) {
        const parsed=JSON.parse(raw) as SavedAccess;
        assertEntityId(parsed.userId);
        if(parsed.version!==1||typeof parsed.associated!=='boolean'||typeof parsed.blocked!=='boolean') throw new TypeError('Registro de acesso inválido.');
        this.#saved=parsed;
      }
    } catch { this.#saved=undefined; }
  }
  get snapshot():SessionView {
    const saved=this.#saved;
    const onlineVerified=this.#verified&&this.now()<this.#expiresAt;
    const canView=!!saved&&!saved.blocked&&saved.associated;
    return {
      userId:saved?.userId??'',epoch:this.#epoch,onlineVerified,expiresAt:this.#expiresAt,
      canView,canWriteLocal:canView,
      canTransmit:onlineVerified&&!!saved&&!saved.blocked&&this.#writesEnabled,
      message:!saved||saved.blocked?'Entre com Google para acessar seus dados.':!saved.associated?'Confirme a associação inicial online.':!onlineVerified?'Dados locais preservados. Entre novamente antes de sincronizar.':!this.#writesEnabled?'Envio remoto desativado pelo responsável.':'Sessão verificada.',
    };
  }
  verify(userId:string,expiresAt:number,writesEnabled:boolean,interactive=false) {
    assertEntityId(userId);
    if(this.#saved?.blocked&&!interactive) throw new Error('A saída explícita exige um novo login Google.');
    if(!Number.isSafeInteger(expiresAt)||expiresAt<=this.now()) throw new Error('A sessão já expirou.');
    const old=this.#saved;
    // A different account never inherits an offline grant, association or visibility.
    this.#saved={version:1,userId,associated:old?.userId===userId&&old.associated===true,blocked:false};
    this.#verified=true;this.#expiresAt=expiresAt;this.#writesEnabled=writesEnabled;this.#epoch++;
    this.persist();
  }
  markAssociated(userId:string) {
    if(!this.#saved||this.#saved.userId!==userId||!this.snapshot.onlineVerified||this.#saved.blocked) throw new Error('A associação exige a mesma identidade verificada online.');
    this.#saved={...this.#saved,associated:true};this.persist();
  }
  expire() { this.#verified=false;this.#expiresAt=0;this.#epoch++; }
  deny() { this.lock(); }
  lock() {
    this.#verified=false;this.#expiresAt=0;this.#writesEnabled=false;this.#epoch++;
    if(this.#saved) { this.#saved={...this.#saved,blocked:true};this.persist(); }
  }
  /** Other tabs lock immediately, before a network sign-out could finish/fail. */
  reloadFromStorage() {
    this.#verified=false;this.#expiresAt=0;this.#epoch++;
    try {
      const raw=this.storage.getItem(this.storageKey);
      if(!raw) {this.#saved=undefined;return;}
      const saved=JSON.parse(raw) as SavedAccess;
      if(saved.userId!==this.#saved?.userId) this.#saved=undefined;
      else if(saved.blocked) this.#saved={...this.#saved,blocked:true};
    } catch {this.#saved=undefined;}
  }
  private persist() {
    try { this.storage.setItem(this.storageKey,JSON.stringify(this.#saved)); }
    catch {
      this.#verified=false;this.#expiresAt=0;this.#epoch++;if(this.#saved)this.#saved.blocked=true;
      try {this.storage.removeItem(this.storageKey);} catch { /* Memory remains locked; storage protection is unavailable. */ }
      throw new Error('Não foi possível preservar o acesso neste navegador. Dados financeiros não foram apagados.');
    }
  }
}
