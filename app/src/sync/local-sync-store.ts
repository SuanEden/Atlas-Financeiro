import Dexie, { type EntityTable } from 'dexie';
import { assertEntityId, type FinancialDataset } from '../domain';
import { deserializeFinancialDataset, serializeFinancialDataset } from '../serialization';
import { canonicalJson } from '../serialization/canonical-json';
import { assertEnvelope, assertFields, assertRevision, assertSize, DATA_TABLES, emptyDataset, envelopeData, jsonDigest, mergeAppendOnly, receiptAcknowledges, type BootstrapEnvelope, type ChangePage, type Receipt, type SyncEnvelope } from './protocol';

export interface PendingDelivery {
  id: string; envelope: SyncEnvelope; digest: string; operationDigest?: string; ordinal: number;
  status: 'pending' | 'acknowledged' | 'conflict' | 'blocked'; error?: string;
}
interface SyncMeta { id: 'context'; cursor: string; ordinal: number; binding: 'unbound' | 'bootstrap' | 'verifying_source' | 'join' | 'active'; associationId?: string; sourceDigest?: string }
interface ConfirmedRow { id: 'confirmed'; json: string }
interface StoredReceipt extends Receipt { id: string }
class SyncDatabase extends Dexie {
  confirmed!: EntityTable<ConfirmedRow,'id'>;
  pending!: EntityTable<PendingDelivery,'id'>;
  receipts!: EntityTable<StoredReceipt,'id'>;
  meta!: EntityTable<SyncMeta,'id'>;
  constructor(name: string) { super(name); this.version(1).stores({ confirmed:'id',pending:'id,ordinal,status',receipts:'id,revision',meta:'id' }); }
}
const ALL = ['confirmed','pending','receipts','meta'];

/** Separate I3 namespace. Opening this store NEVER migrates or mutates an I2 database. */
export class LocalSyncStore {
  readonly #db: SyncDatabase;
  readonly name: string;
  constructor(readonly userId: string, serverId: string, deviceNamespace='default') {
    assertEntityId(userId);
    if (!/^[a-z0-9.-]{1,100}$/.test(serverId) || !/^[a-z0-9-]{1,60}$/.test(deviceNamespace)) throw new TypeError('Contexto local de sincronização inválido.');
    this.name=`atlas-financeiro:sync:v1:${serverId}:${userId}:${deviceNamespace}`;
    this.#db=new SyncDatabase(this.name);
  }

  async prepareAssociation(envelope: BootstrapEnvelope): Promise<void> {
    this.assertOwner(envelope);
    const delivery=await prepareDelivery(envelope);
    await this.#db.transaction('rw',ALL,async()=>{
      const meta=await this.meta();
      if(meta.binding!=='unbound') {
        const prior=await this.#db.pending.get(envelope.operationId);
        if(meta.associationId===envelope.operationId&&prior?.digest===delivery.digest) return;
        throw new Error('Já existe associação neste contexto. Nada foi substituído.');
      }
      if((await this.#db.pending.count())>0||Object.values(await this.confirmed()).some((rows)=>rows.length>0)) throw new Error('Associação exige destino local vazio.');
      envelopeData(envelope); // Validate the full bootstrap before any writes.
      await this.#db.pending.add({...delivery,ordinal:1});
      await this.#db.meta.put({...meta,binding:'bootstrap',associationId:envelope.operationId,sourceDigest:envelope.source.digest,ordinal:1});
    });
  }

  async prepareJoin(): Promise<void> {
    await this.#db.transaction('rw',ALL,async()=>{
      const meta=await this.meta();
      if(meta.binding==='active'||meta.binding==='join') return;
      if(meta.binding!=='unbound'||await this.#db.pending.count()) throw new Error('Há uma associação pendente; não unir automaticamente.');
      await this.#db.meta.put({...meta,binding:'join'});
    });
  }

  async activateJoin(through: string): Promise<void> {
    assertRevision(through);
    await this.#db.transaction('rw',this.#db.meta,async()=>{
      const meta=await this.meta();
      if(meta.binding!=='join'||meta.cursor!==through) throw new Error('A leitura inicial ainda não foi confirmada por inteiro.');
      await this.#db.meta.put({...meta,binding:'active'});
    });
  }

  async activateAssociation(currentSourceDigest: string): Promise<void> {
    await this.#db.transaction('rw',this.#db.meta,async()=>{
      const meta=await this.meta();
      if(meta.binding!=='verifying_source'||meta.sourceDigest!==currentSourceDigest) throw new Error('A origem mudou ou o recibo ainda não foi conferido. A origem e a cópia remota foram preservadas; não reenviar como nova associação.');
      await this.#db.meta.put({...meta,binding:'active'});
    });
  }

  async enqueue(envelope: SyncEnvelope): Promise<void> {
    this.assertOwner(envelope);
    if(envelope.kind==='bootstrap') throw new Error('Carga inicial usa o procedimento explícito de associação.');
    const delivery=await prepareDelivery(envelope);
    await this.#db.transaction('rw',ALL,async()=>{
      const meta=await this.meta();
      if(meta.binding!=='active') throw new Error('Conclua a associação inicial online antes de registrar offline.');
      const prior=await this.#db.pending.get(envelope.operationId);
      if(prior) { if(prior.digest===delivery.digest) return; throw new Error('ID de operação reutilizado com outro conteúdo.'); }
      if(await this.#db.receipts.get(envelope.operationId)) throw new Error('Esta operação já foi confirmada.');
      const current=project(await this.confirmed(),await this.#db.pending.orderBy('ordinal').toArray(),this.userId);
      mergeAppendOnly(current.data,envelopeData(envelope),this.userId);
      await this.#db.pending.add({...delivery,ordinal:meta.ordinal+1});
      await this.#db.meta.put({...meta,ordinal:meta.ordinal+1});
    });
  }

  /** An acknowledgement is stored, but effects remain projected until the matching feed is applied. */
  async acknowledge(id: string, receipt: Receipt): Promise<void> {
    const pending=await this.#db.pending.get(id);
    if(!pending||!await receiptAcknowledges(pending.envelope,receipt)) throw new Error('Recibo não comprova esta operação.');
    await this.#db.transaction('rw',this.#db.pending,this.#db.receipts,async()=>{
      const current=await this.#db.pending.get(id);
      if(!current||current.digest!==pending.digest) throw new Error('A pendência mudou durante a confirmação.');
      await this.#db.pending.put({...current,status:'acknowledged'});
      await this.putReceipt(receipt);
    });
  }

  async markConflict(id: string, code: string): Promise<void> {
    await this.#db.transaction('rw',this.#db.pending,async()=>{
      const row=await this.#db.pending.get(id);
      if(row) await this.#db.pending.put({...row,status:'conflict',error:code});
    });
  }

  async applyPage(page: ChangePage): Promise<void> {
    const acknowledgements=await validatePage(page,this.userId);
    await this.#db.transaction('rw',ALL,async()=>{
      const meta=await this.meta();
      if(meta.cursor!==page.after) throw new Error('O cursor mudou em outra aba. Repetir a leitura a partir da revisão atual.');
      let confirmed=await this.confirmed();
      for(const batch of page.batches) {
        confirmed=mergeAppendOnly(confirmed,envelopeData(batch.envelope),this.userId);
        await this.putReceipt(batch.receipt);
        for(const pending of await this.#db.pending.toArray()) {
          const ack=acknowledgements.get(pending.id);
          if(ack&&(ack.envelopeDigest===pending.digest||(pending.operationDigest!==undefined&&ack.operationDigest===pending.operationDigest))) await this.#db.pending.delete(pending.id);
        }
      }
      // Recompute against confirmed history; losing edits remain durable conflicts, never merged into balances.
      const projected=project(confirmed,await this.#db.pending.orderBy('ordinal').toArray(),this.userId);
      for(const pending of projected.pending) await this.#db.pending.put(pending);
      let binding=meta.binding;
      if(binding==='bootstrap'&&meta.associationId&&page.batches.some((batch)=>batch.receipt.operationId===meta.associationId)) binding='verifying_source';
      await this.#db.confirmed.put({id:'confirmed',json:serializeFinancialDataset(confirmed,this.userId)});
      await this.#db.meta.put({...meta,cursor:page.cursor,binding});
    });
  }

  async read() {
    return this.#db.transaction('r',ALL,async()=>{
      const meta=await this.meta(); const confirmed=await this.confirmed();
      const projection=project(confirmed,await this.#db.pending.orderBy('ordinal').toArray(),this.userId);
      return {meta,confirmed,projection:projection.data,pending:projection.pending,receipts:await this.#db.receipts.toArray()};
    });
  }
  close() { this.#db.close(); }
  private assertOwner(envelope: SyncEnvelope) { assertEnvelope(envelope); if(envelope.userId!==this.userId) throw new TypeError('Operação de outro contexto.'); }
  private async meta(): Promise<SyncMeta> { return await this.#db.meta.get('context')??{id:'context',cursor:'0',ordinal:0,binding:'unbound'}; }
  private async confirmed(): Promise<FinancialDataset> { const row=await this.#db.confirmed.get('confirmed'); return row?deserializeFinancialDataset(row.json,this.userId):emptyDataset(); }
  private async putReceipt(receipt: Receipt) {
    const prior=await this.#db.receipts.get(receipt.operationId);
    if(prior) {
      const {id:_id,...saved}=prior;
      if(canonicalJson(saved)!==canonicalJson(receipt)) throw new Error('Recibo remoto mudou de conteúdo.');
    }
    await this.#db.receipts.put({...receipt,id:receipt.operationId});
  }
}

async function prepareDelivery(envelope: SyncEnvelope): Promise<Omit<PendingDelivery,'ordinal'>> {
  const copy=structuredClone(envelope);
  return {id:copy.operationId,envelope:copy,digest:await jsonDigest(copy),...(copy.kind==='bootstrap'?{}:{operationDigest:await jsonDigest(copy.operation)}),status:'pending'};
}

function project(confirmed: FinancialDataset, input: PendingDelivery[], owner: string) {
  let data=structuredClone(confirmed); const pending=structuredClone(input); let remaining=pending.filter((row)=>row.status!=='conflict');
  while(remaining.length) {
    let progressed=false; const next:PendingDelivery[]=[];
    for(const row of remaining) {
      const incoming=envelopeData(row.envelope);
      if(!referencesPresent(data,incoming)) { next.push(row); continue; }
      try { data=mergeAppendOnly(data,incoming,owner); if(row.status==='blocked') row.status='pending'; }
      catch { row.status='conflict'; row.error='CONCURRENT_FINANCIAL_CHANGE'; }
      progressed=true;
    }
    if(!progressed) { for(const row of next) { row.status='blocked'; row.error='MISSING_OR_CONFLICTED_DEPENDENCY'; } break; }
    remaining=next;
  }
  return {data,pending};
}

function referencesPresent(base: FinancialDataset,incoming: FinancialDataset): boolean {
  const ids=Object.fromEntries(DATA_TABLES.map((table)=>[table,new Set([...base[table],...incoming[table]].map((row)=>row.id))])) as Record<typeof DATA_TABLES[number],Set<string>>;
  return incoming.categories.every((row)=>!row.parentId||ids.categories.has(row.parentId))
    &&incoming.events.every((row)=>ids.accounts.has(row.accountId)&&(!row.transferAccountId||ids.accounts.has(row.transferAccountId))&&(!row.categoryId||ids.categories.has(row.categoryId))&&(!row.reversesEventId||ids.events.has(row.reversesEventId))&&(!row.replacesEventId||ids.events.has(row.replacesEventId)))
    &&incoming.settlements.every((row)=>ids.events.has(row.eventId))&&incoming.postings.every((row)=>ids.accounts.has(row.accountId)&&ids.settlements.has(row.settlementId));
}

async function validatePage(page: ChangePage,owner: string) {
  assertFields(page,['protocolVersion','userId','after','through','cursor','batches']);
  if(page.protocolVersion!==1||page.userId!==owner||!Array.isArray(page.batches)||page.batches.length>20) throw new TypeError('Página incompatível ou de outro usuário.');
  for(const revision of [page.after,page.through,page.cursor]) assertRevision(revision);
  if(BigInt(page.after)>BigInt(page.cursor)||BigInt(page.cursor)>BigInt(page.through)) throw new TypeError('Limites de página inconsistentes.');
  let expected=BigInt(page.after)+1n;
  const acks=new Map<string,{envelopeDigest?:string;operationDigest?:string}>();
  for(const batch of page.batches) {
    assertFields(batch,['revision','envelope','receipt']); assertEnvelope(batch.envelope);
    assertRevision(batch.revision);
    if(BigInt(batch.revision)!==expected++||batch.envelope.userId!==owner||batch.receipt.revision!==batch.revision||!await receiptAcknowledges(batch.envelope,batch.receipt)) throw new TypeError('Lote/recibo inválido ou lacuna no feed.');
    assertSize(batch.envelope);
    acks.set(batch.envelope.operationId,{envelopeDigest:batch.receipt.digest});
    for(const covered of batch.receipt.coveredOperations) acks.set(covered.id,{operationDigest:covered.digest});
  }
  if(BigInt(page.cursor)!==expected-1n||(!page.batches.length&&page.cursor!==page.through)) throw new TypeError('Cursor não corresponde à página persistida.');
  return acks;
}
