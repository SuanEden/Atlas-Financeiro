import Dexie, { type EntityTable } from 'dexie';
import { assertEntityId, type FinancialDataset } from '../domain';
import { deserializeFinancialDataset, serializeFinancialDataset } from '../serialization';
import { canonicalJson } from '../serialization/canonical-json';
import { assertEnvelope, assertFields, assertRevision, assertSize, DATA_TABLES, emptyDataset, envelopeData, jsonDigest, mergeAppendOnly, receiptAcknowledges, type BootstrapEnvelope, type ChangePage, type Receipt, type SyncEnvelope } from './protocol';

export interface PendingDelivery {
  id: string; envelope: SyncEnvelope; digest: string; operationDigest?: string; ordinal: number;
  status: 'pending' | 'acknowledged' | 'conflict' | 'blocked' | 'resolved'; error?: string;
}
interface SyncMeta { id: 'context'; version?: 1; cursor: string; ordinal: number; binding: 'unbound' | 'bootstrap' | 'verifying_source' | 'join' | 'active'; associationId?: string; sourceDigest?: string; sourceOwnerId?:string; sourceMode?:'empty'|'i2' }
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
  constructor(readonly userId: string, readonly serverId: string, deviceNamespace='default') {
    assertEntityId(userId);
    if (!/^[a-z0-9.-]{1,100}$/.test(serverId) || !/^[a-z0-9-]{1,60}$/.test(deviceNamespace)) throw new TypeError('Contexto local de sincronização inválido.');
    this.name=`atlas-financeiro:sync:v1:${serverId}:${userId}:${deviceNamespace}`;
    this.#db=new SyncDatabase(this.name);
  }

  async prepareAssociation(envelope: BootstrapEnvelope, sourceMode:'empty'|'i2'='i2'): Promise<void> {
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
      await this.#db.meta.put({...meta,binding:'bootstrap',associationId:envelope.operationId,sourceDigest:envelope.source.digest,sourceOwnerId:envelope.source.ownerId,sourceMode,ordinal:1});
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
    await this.#db.transaction('rw',ALL,async()=>{
      const meta=await this.meta();
      if(meta.binding!=='join'||meta.cursor!==through) throw new Error('A leitura inicial ainda não foi confirmada por inteiro.');
      await this.#db.meta.put({...meta,binding:'active'});
    });
  }

  async activateAssociation(currentSourceDigest: string): Promise<void> {
    await this.#db.transaction('rw',ALL,async()=>{
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
    await this.#db.transaction('rw',ALL,async()=>{
      await this.meta();
      const current=await this.#db.pending.get(id);
      if(!current||current.digest!==pending.digest) throw new Error('A pendência mudou durante a confirmação.');
      assertDelivery(current,this.userId);
      await this.#db.pending.put({...current,status:'acknowledged'});
      await this.putReceipt(receipt);
    });
  }

  async markConflict(id: string, code: string): Promise<void> {
    await this.#db.transaction('rw',ALL,async()=>{
      await this.meta();
      const row=await this.#db.pending.get(id);
      if(row) assertDelivery(row,this.userId);
      if(row) await this.#db.pending.put({...row,status:'conflict',error:code});
    });
  }

  /** Keep the losing command as evidence; acceptance never deletes history or retries it. */
  async resolveConflict(id:string):Promise<void> {
    await this.#db.transaction('rw',ALL,async()=>{
      await this.meta();
      const row=await this.#db.pending.get(id);
      if(row) assertDelivery(row,this.userId);
      if(!row||row.status!=='conflict') throw new Error('O conflito precisa estar disponível para conferência.');
      await this.#db.pending.put({...row,status:'resolved'});
    });
  }

  async applyPage(page: ChangePage): Promise<void> {
    const acknowledgements=await validatePage(page,this.userId);
    await this.#db.transaction('rw',ALL,async()=>{
      const meta=await this.meta();
      if(meta.cursor!==page.after) throw new Error('O cursor mudou em outra aba. Repetir a leitura a partir da revisão atual.');
      let confirmed=await this.confirmed();
      // Validate even resolved/conflicting rows before a feed can acknowledge/remove anything.
      const pendingBefore=await this.#db.pending.toArray();
      project(confirmed,pendingBefore,this.userId);
      // Keep the transaction alive while hashing: another tab cannot change a row
      // between this check and receipt-driven removal in the same transaction.
      await Dexie.waitFor(Promise.all(pendingBefore.map(async row=>{
        if(await jsonDigest(row.envelope)!==row.digest||(row.operationDigest!==undefined&&(row.envelope.kind==='bootstrap'||await jsonDigest(row.envelope.operation)!==row.operationDigest))) throw new TypeError('Pendência divergente da cópia original.');
      })));
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
  /** Restore only into an empty namespace (or recognize an identical retry). No network/Auth writes. */
  async recoverBackup(json: string, stillAuthorized: () => boolean): Promise<void> {
    const backup = await validateSyncBackup(json, this.userId, this.serverId);
    await this.#db.transaction('rw', ALL, async () => {
      if (!stillAuthorized()) throw new Error('Entre com a mesma conta antes de recuperar.');
      const occupied = (await this.#db.confirmed.count()) + (await this.#db.pending.count())
        + (await this.#db.receipts.count()) + (await this.#db.meta.count());
      if (occupied) {
        const current = { meta: await this.meta(), confirmed: await this.confirmed(),
          pending: await this.#db.pending.orderBy('ordinal').toArray(), receipts: await this.#db.receipts.toArray() };
        if (snapshotKey(current, this.userId) === snapshotKey(backup, this.userId)) return;
        throw new Error('Este navegador já contém uma base diferente. Use um perfil vazio; nada foi substituído.');
      }
      await this.#db.confirmed.put({ id: 'confirmed', json: serializeFinancialDataset(backup.confirmed, this.userId) });
      await this.#db.pending.bulkAdd(backup.pending);
      await this.#db.receipts.bulkAdd(backup.receipts);
      await this.#db.meta.put(backup.meta);
      // Auth can change while IndexedDB requests yield. Throwing aborts all four tables.
      if (!stillAuthorized()) throw new Error('A sessão mudou durante a recuperação. Nada foi gravado.');
    });
  }

  close() { this.#db.close(); }
  private assertOwner(envelope: SyncEnvelope) { assertEnvelope(envelope); if(envelope.userId!==this.userId) throw new TypeError('Operação de outro contexto.'); }
  private async meta(): Promise<SyncMeta> {
    const rows=await this.#db.meta.toArray();
    if(rows.length===0) {
      if(await this.#db.confirmed.count()||await this.#db.pending.count()||await this.#db.receipts.count()) throw new TypeError('Contexto de sincronização ausente. Preserve esta base para conferência.');
      return {id:'context',version:1,cursor:'0',ordinal:0,binding:'unbound'};
    }
    if(rows.length!==1) throw new TypeError('Contexto de sincronização incompatível. Preserve esta base para conferência.');
    const meta=rows[0]!;
    validateMeta(meta);
    return meta;
  }
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
  for(const row of input) assertDelivery(row,owner);
  let data=structuredClone(confirmed); const pending=structuredClone(input); let remaining=pending.filter((row)=>row.status!=='conflict'&&row.status!=='resolved');
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

function assertKnownFields(value: unknown,required: readonly string[],optional: readonly string[]) {
  if(!value||typeof value!=='object'||Array.isArray(value)||required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>!required.includes(key)&&!optional.includes(key))) throw new TypeError('Formato local incompatível. Preserve os dados e use uma versão compatível.');
}

function assertDelivery(row: PendingDelivery,owner: string) {
  assertKnownFields(row,['id','envelope','digest','ordinal','status'],['operationDigest','error']);
  assertEnvelope(row.envelope);
  if(row.id!==row.envelope.operationId||row.envelope.userId!==owner||!Number.isSafeInteger(row.ordinal)||row.ordinal<1||!['pending','acknowledged','conflict','blocked','resolved'].includes(row.status)||typeof row.digest!=='string'||!/^[0-9a-f]{64}$/.test(row.digest)) throw new TypeError('Pendência local incompatível. Nada foi enviado ou descartado.');
  if('operationDigest' in row&&(typeof row.operationDigest!=='string'||!/^[0-9a-f]{64}$/.test(row.operationDigest))) throw new TypeError('Digest de operação incompatível.');
  if('error' in row&&typeof row.error!=='string') throw new TypeError('Estado de pendência incompatível.');
}

function referencesPresent(base: FinancialDataset,incoming: FinancialDataset): boolean {
  const ids=Object.fromEntries(DATA_TABLES.map((table)=>[table,new Set([...(base[table] ?? []),...(incoming[table] ?? [])].map((row)=>row.id))])) as Record<typeof DATA_TABLES[number],Set<string>>;
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

function validateMeta(meta: SyncMeta): void {
    assertKnownFields(meta,['id','cursor','ordinal','binding'],['version','associationId','sourceDigest','sourceOwnerId','sourceMode']);
    if(meta.id!=='context'||('version' in meta&&meta.version!==1)||!Number.isSafeInteger(meta.ordinal)||meta.ordinal<0||!['unbound','bootstrap','verifying_source','join','active'].includes(meta.binding)) throw new TypeError('Contexto de sincronização incompatível. Preserve esta base para conferência.');
    assertRevision(meta.cursor);
    if('associationId' in meta) assertEntityId(meta.associationId);
    if('sourceOwnerId' in meta) assertEntityId(meta.sourceOwnerId);
    if('sourceDigest' in meta&&(typeof meta.sourceDigest!=='string'||!/^[0-9a-f]{64}$/.test(meta.sourceDigest))) throw new TypeError('Proveniência incompatível.');
    if('sourceMode' in meta&&!['empty','i2'].includes(meta.sourceMode!)) throw new TypeError('Origem de sincronização incompatível.');
    // Known legacy v1 records need no rewrite/migration. Unknown versions never reach a put().
}

export const MAX_SYNC_BACKUP_BYTES = 10 * 1024 * 1024;
interface SyncCopy {
  meta: SyncMeta; confirmed: FinancialDataset; projection: FinancialDataset;
  pending: PendingDelivery[]; receipts: StoredReceipt[];
}

/** Strict file boundary. File contents never establish an authenticated identity or transmission grant. */
export async function validateSyncBackup(json: string, owner: string, serverId: string): Promise<SyncCopy> {
  if (new TextEncoder().encode(json).byteLength > MAX_SYNC_BACKUP_BYTES) throw new RangeError('O arquivo excede o limite de 10 MiB.');
  const root = JSON.parse(json);
  assertKnownFields(root, ['format','schemaVersion','protocolVersion','exportedAt','userId','serverId','confirmed','projection','pending','receipts','meta'], ['integritySha256']);
  if ('integritySha256' in root) {
    const {exportedAt: _date, integritySha256, ...contents} = root;
    if (typeof integritySha256 !== 'string' || integritySha256 !== await jsonDigest(contents)) throw new TypeError('O arquivo diverge da cópia exportada. Preserve o original.');
  }
  if (root.format !== 'atlas-financeiro-sync-backup' || root.schemaVersion !== 1 || root.protocolVersion !== 1)
    throw new TypeError('Selecione uma cópia de sincronização I3 compatível.');
  if (root.userId !== owner || root.serverId !== serverId) throw new TypeError('A cópia pertence a outra conta ou servidor.');
  if (typeof root.exportedAt !== 'string' || !Number.isFinite(Date.parse(root.exportedAt))
    || new Date(root.exportedAt).toISOString() !== root.exportedAt) throw new TypeError('Data de exportação inválida.');
  validateMeta(root.meta);
  if (!Array.isArray(root.pending) || !Array.isArray(root.receipts)) throw new TypeError('Pendências ou recibos ausentes.');
  const confirmed = deserializeFinancialDataset(JSON.stringify(root.confirmed), owner);
  const projection = deserializeFinancialDataset(JSON.stringify(root.projection), owner);
  if (DATA_TABLES.reduce((n, key) => n + confirmed[key].length + projection[key].length, 0)
    + root.pending.length + root.receipts.length > 50_000) throw new RangeError('A cópia excede 50 mil registros.');
  const pending = root.pending as PendingDelivery[];
  const ids = new Set<string>(); const ordinals = new Set<number>();
  for (const row of pending) {
    assertDelivery(row, owner);
    if (ids.has(row.id) || ordinals.has(row.ordinal) || row.ordinal > root.meta.ordinal) throw new TypeError('Ordem ou identidade de pendência inválida.');
    ids.add(row.id); ordinals.add(row.ordinal);
    if (await jsonDigest(row.envelope) !== row.digest || (row.operationDigest !== undefined
      && (row.envelope.kind === 'bootstrap' || await jsonDigest(row.envelope.operation) !== row.operationDigest)))
      throw new TypeError('Conteúdo da pendência diverge do digest.');
  }
  const receipts = root.receipts as StoredReceipt[];
  const receiptIds = new Set<string>(); const revisions = new Set<string>();
  for (const row of receipts) {
    assertFields(row, ['id','protocolVersion','userId','operationId','revision','digest','coveredOperations']);
    assertEntityId(row.operationId); assertRevision(row.revision);
    if (row.id !== row.operationId || row.userId !== owner || row.protocolVersion !== 1 || row.revision === '0'
      || receiptIds.has(row.id) || revisions.has(row.revision) || typeof row.digest !== 'string'
      || !/^[0-9a-f]{64}$/.test(row.digest) || !Array.isArray(row.coveredOperations)) throw new TypeError('Recibo incompatível.');
    const coveredIds = new Set<string>();
    for (const covered of row.coveredOperations) {
      assertFields(covered, ['id','digest']); assertEntityId(covered.id);
      if (coveredIds.has(covered.id) || typeof covered.digest !== 'string' || !/^[0-9a-f]{64}$/.test(covered.digest)) throw new TypeError('Cobertura de recibo inválida.');
      coveredIds.add(covered.id);
    }
    receiptIds.add(row.id); revisions.add(row.revision);
    if (BigInt(row.revision) > BigInt(root.meta.cursor)) {
      const command = pending.find(item => item.id === row.id && item.status === 'acknowledged');
      const {id: _id, ...receipt} = row;
      if (!command || !await receiptAcknowledges(command.envelope, receipt)) throw new TypeError('Recibo adiantado sem pendência confirmada.');
    }
  }
  const confirmedRevisions = receipts.filter(row => BigInt(row.revision) <= BigInt(root.meta.cursor)).map(row => BigInt(row.revision)).sort((a,b) => a < b ? -1 : 1);
  if (BigInt(confirmedRevisions.length) !== BigInt(root.meta.cursor)
    || confirmedRevisions.some((revision, i) => revision !== BigInt(i + 1))) throw new TypeError('Há uma lacuna no histórico de recibos.');
  for (const command of pending.filter(row => row.status === 'acknowledged')) {
    const saved = receipts.find(row => row.id === command.id);
    if (!saved) throw new TypeError('Pendência confirmada sem recibo.');
    const {id: _id, ...receipt} = saved;
    if (!await receiptAcknowledges(command.envelope, receipt)) throw new TypeError('Recibo diverge da operação.');
  }
  if (root.meta.binding === 'unbound' && (pending.length || receipts.length || root.meta.cursor !== '0'
    || DATA_TABLES.some(key => confirmed[key].length))) throw new TypeError('Base sem associação contém registros.');
  if (['bootstrap','verifying_source'].includes(root.meta.binding) && (!root.meta.associationId || !root.meta.sourceDigest || !root.meta.sourceOwnerId || !root.meta.sourceMode))
    throw new TypeError('Proveniência da associação ausente.');
  if (root.meta.binding === 'active' && root.meta.cursor === '0') throw new TypeError('Associação ativa sem revisão confirmada.');
  if (root.meta.cursor === '0' && DATA_TABLES.some(key => confirmed[key].length)) throw new TypeError('Base confirmada sem revisão de origem.');
  const calculated = project(confirmed, pending, owner);
  if (serializeFinancialDataset(calculated.data, owner) !== serializeFinancialDataset(projection, owner)
    || canonicalJson(calculated.pending) !== canonicalJson(pending)) throw new TypeError('A projeção não corresponde à base e às pendências.');
  return { meta: root.meta, confirmed, projection, pending, receipts };
}

function snapshotKey(state: {meta: SyncMeta; confirmed: FinancialDataset; pending: PendingDelivery[]; receipts: StoredReceipt[]}, owner: string): string {
  return canonicalJson({meta: state.meta, confirmed: JSON.parse(serializeFinancialDataset(state.confirmed, owner)),
    pending: [...state.pending].sort((a,b) => a.ordinal-b.ordinal), receipts: [...state.receipts].sort((a,b) => a.id.localeCompare(b.id))});
}
