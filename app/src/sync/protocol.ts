import { assertEntityId, assertFinancialDataset, type FinancialDataset, type LocalFinancialState, type PendingOperation } from '../domain';
import { serializeFinancialDataset, deserializeFinancialDataset } from '../serialization';
import { canonicalJson } from '../serialization/canonical-json';
import { assertPendingOperation } from '../serialization/pending-operation';
import { canonicalLocalState, validateI2Backup } from '../backup/validate-i2-backup';
import { serializeLocalBackup } from '../backup/local-backup';
import { deserializeFinancialAggregate } from '../serialization/financial-json';
import { incorporateLifecyclePage } from '../domain/lifecycle';

export const SYNC_PROTOCOL_VERSION = 1 as const;
export const MAX_COMMAND_BYTES = 128 * 1024;
export const MAX_BOOTSTRAP_BYTES = 2 * 1024 * 1024;
export const DATA_TABLES = ['accounts', 'categories', 'events', 'settlements', 'postings', 'accountReconciliations', 'entityLifecycles'] as const;
export type JsonRecord = Record<string, unknown>;
export interface WireOperation { id: string; userId: string; kind: PendingOperation['kind']; createdAt: string; payload: JsonRecord }
interface EnvelopeBase { protocolVersion: 1; operationId: string; userId: string; baseRevision: string }
export interface CommandEnvelope extends EnvelopeBase { kind: PendingOperation['kind']; operation: WireOperation }
export interface BootstrapEnvelope extends EnvelopeBase {
  kind: 'bootstrap'; source: { ownerId: string; digest: string }; data: JsonRecord; coveredOperations: WireOperation[];
}
export type SyncEnvelope = CommandEnvelope | BootstrapEnvelope;
export interface Receipt {
  protocolVersion: 1; userId: string; operationId: string; revision: string; digest: string;
  coveredOperations: { id: string; digest: string }[];
}
export interface ChangeBatch { revision: string; envelope: SyncEnvelope; receipt: Receipt }
export interface ChangePage { protocolVersion: 1; userId: string; after: string; through: string; cursor: string; batches: ChangeBatch[] }

export function assertRevision(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,18})$/.test(value) || BigInt(value) > 9223372036854775807n) throw new TypeError('Revisão de sincronização inválida.');
}

export async function jsonDigest(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Reject v3 financial data unless the authenticated server explicitly advertises
 * the v3 migration. Older I3 installations are conservatively treated as v2.
 */
export function isI3SchemaCompatible(envelope: SyncEnvelope, serverSchemaVersion = 2): boolean {
  if (![2,3,4].includes(serverSchemaVersion)) return false;
  const data=envelope.kind==='bootstrap'?envelope.data:envelope.operation.payload;
  const unsupportedLifecycleFields=new Set(['archivedAt','deletedAt','isArchived','lifecycleVersion','entityVersion','archivedEntities','tombstones','entityVersions']);
  if(Object.keys(data).some(key=>unsupportedLifecycleFields.has(key)))return false;
  if(serverSchemaVersion<4&&(envelope.kind==='manage_entity'||data.entityLifecycles!==undefined||data.lifecycleChange!==undefined))return false;
  if(envelope.kind==='bootstrap'&&envelope.coveredOperations.some(operation=>{
    const payload=operation.payload;
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return true;
    if(Object.keys(payload).some(key=>unsupportedLifecycleFields.has(key)))return true;
    return (['accounts','categories'] as const).some(table=>{
      const rows=payload[table];
      return rows!==undefined&&(!Array.isArray(rows)||rows.some(row=>!row||typeof row!=='object'||Array.isArray(row)
        ||Object.keys(row).some(key=>unsupportedLifecycleFields.has(key))));
    });
  }))return false;
  for(const table of ['accounts','categories'] as const) {
    const rows=data[table];
    if(rows!==undefined&&(!Array.isArray(rows)||rows.some(value=>!value||typeof value!=='object'||Array.isArray(value)
      ||Object.keys(value).some(key=>unsupportedLifecycleFields.has(key)))))return false;
  }
  if(envelope.kind==='bootstrap') {
    if(data.schemaVersion!==2&&data.schemaVersion!==3&&!(serverSchemaVersion>=4&&data.schemaVersion===4))return false;
    if(data.schemaVersion===4&&!Array.isArray(data.entityLifecycles))return false;
  }
  const hasReconciliations=Array.isArray(data.accountReconciliations)&&data.accountReconciliations.length>0;
  if(serverSchemaVersion<3&&(envelope.kind==='reconcile_account'||hasReconciliations))return false;
  const events=Array.isArray(data.events)?data.events:[];
  return !events.some(value=>{
    if(typeof value!=='object'||value===null||Array.isArray(value))return true;
    const event=value as Record<string,unknown>;
    if(serverSchemaVersion<3&&(event.recurrenceJson!==undefined||event.recurrenceRuleId!==undefined||event.recurrenceMonth!==undefined))return true;
    if(envelope.kind==='record_event'&&event.source==='opening_balance')return true;
    return false;
  });
}

export function wireOperation(operation: PendingOperation): WireOperation {
  assertPendingOperation(operation, operation.userId);
  return { id: operation.id, userId: operation.userId, kind: operation.kind, createdAt: operation.createdAt, payload: JSON.parse(operation.payloadJson) as JsonRecord };
}

export function commandEnvelope(operation: PendingOperation, baseRevision: string): CommandEnvelope {
  assertRevision(baseRevision);
  const envelope: CommandEnvelope = { protocolVersion: 1, operationId: operation.id, userId: operation.userId, baseRevision, kind: operation.kind, operation: wireOperation(operation) };
  assertSize(envelope, MAX_COMMAND_BYTES);
  return envelope;
}

/** Pure proposal only. It neither edits the anonymous source nor authenticates/activates a destination. */
export async function prepareBootstrap(state: LocalFinancialState, sourceOwner: string, authenticatedOwner: string, associationId: string): Promise<BootstrapEnvelope> {
  assertEntityId(authenticatedOwner); assertEntityId(associationId);
  // Reuse the strict I2 boundary before changing ownership, including payload-to-snapshot coverage.
  validateI2Backup(serializeLocalBackup(state, sourceOwner));
  const data = JSON.parse(serializeFinancialDataset(state, sourceOwner)) as JsonRecord;
  const hasLifecycles=Array.isArray(data.entityLifecycles)&&(data.entityLifecycles as unknown[]).length>0;
  const hasReconciliations=Array.isArray(data.accountReconciliations)&&(data.accountReconciliations as unknown[]).length>0;
  const hasRecurrences=Array.isArray(data.events)&&(data.events as JsonRecord[]).some(row=>
    row.recurrenceJson!==undefined||row.recurrenceRuleId!==undefined||row.recurrenceMonth!==undefined);
  if(hasLifecycles) {
    data.schemaVersion=4;
    for(const row of data.entityLifecycles as JsonRecord[])row.revision=0;
  } else if(hasReconciliations||hasRecurrences) {
    data.schemaVersion=3;
    delete data.entityLifecycles;
  } else {
    data.schemaVersion=2;
    delete data.accountReconciliations;
    delete data.entityLifecycles;
  }
  data.userId = authenticatedOwner;
  for (const table of DATA_TABLES) for (const row of (data[table] ?? []) as JsonRecord[]) row.userId = authenticatedOwner;
  const coveredOperations = state.outbox.map((row) => {
    const operation = wireOperation(row);
    operation.userId = authenticatedOwner; operation.payload.userId = authenticatedOwner;
    for (const table of DATA_TABLES) for (const record of (operation.payload[table] ?? []) as JsonRecord[]) record.userId = authenticatedOwner;
    return operation;
  });
  const envelope: BootstrapEnvelope = {
    protocolVersion: 1, operationId: associationId, userId: authenticatedOwner, baseRevision: '0', kind: 'bootstrap',
    source: { ownerId: sourceOwner, digest: await jsonDigest(JSON.parse(canonicalLocalState(state, sourceOwner))) }, data, coveredOperations,
  };
  if (DATA_TABLES.reduce((sum, table) => sum + ((data[table] ?? []) as unknown[]).length, 0) > 5_000) throw new RangeError('Carga inicial acima de 5 mil registros; a origem foi preservada.');
  if (coveredOperations.some((operation) => operation.id === associationId)) throw new TypeError('ID da associação colide com uma operação.');
  assertSize(envelope, MAX_BOOTSTRAP_BYTES);
  return envelope;
}

export function envelopeData(envelope: SyncEnvelope,feedRevision?:string): FinancialDataset {
  if(envelope.kind==='bootstrap')return deserializeFinancialDataset(JSON.stringify(envelope.data),envelope.userId);
  if(envelope.kind==='manage_entity') {
    const change=envelope.operation.payload.lifecycleChange as JsonRecord;
    const revision=feedRevision===undefined?0:Number(feedRevision);
    if(!Number.isSafeInteger(revision)||revision<0)throw new TypeError('Revisão de arquivamento inválida.');
    const row={operationId:envelope.operation.id,userId:envelope.userId,entity:change.entity,entityId:change.entityId,
      expectedVersion:change.expectedVersion,version:Number(change.expectedVersion)+1,nextState:change.nextState,revision,metadata:change.metadata};
    return {accounts:[],categories:[],events:[],settlements:[],postings:[],entityLifecycles:[row as import('../domain').EntityLifecycleRecord]};
  }
  return deserializeFinancialAggregate(JSON.stringify(envelope.operation.payload),envelope.userId);
}

export function mergeAppendOnly(base: FinancialDataset, incoming: FinancialDataset, owner: string): FinancialDataset {
  const merged = structuredClone(base);
  for (const table of DATA_TABLES.filter(name=>name!=='entityLifecycles')) {
    const rows = (merged[table] ?? []) as { id: string; userId: string }[];
    const existing = new Map(rows.map((row) => [row.id, row]));
    for (const row of (incoming[table] ?? [])) {
      const prior = existing.get(row.id);
      if (prior) {
        if (canonicalJson(JSON.parse(JSON.stringify(prior, centsReplacer))) !== canonicalJson(JSON.parse(JSON.stringify(row, centsReplacer)))) throw new TypeError('Mesmo ID com conteúdo financeiro diferente.');
      } else { if (merged[table] === undefined) (merged as unknown as Record<string, unknown>)[table] = rows; rows.push(structuredClone(row)); existing.set(row.id, row); }
    }
  }
  merged.entityLifecycles=incorporateLifecyclePage(merged.entityLifecycles??[],incoming.entityLifecycles??[],owner,true);
  assertFinancialDataset(merged, owner);
  return merged;
}

function centsReplacer(_key: string, value: unknown) { return typeof value === 'bigint' ? value.toString() : value; }
export function emptyDataset(): FinancialDataset { return { accounts: [], categories: [], events: [], settlements: [], postings: [], entityLifecycles: [] }; }
export function assertSize(envelope: SyncEnvelope, maximum = envelope.kind === 'bootstrap' ? MAX_BOOTSTRAP_BYTES : MAX_COMMAND_BYTES): void {
  if (new TextEncoder().encode(canonicalJson(envelope)).byteLength > maximum) throw new RangeError('Operação acima do limite de envio; os dados locais foram preservados.');
}

export function assertEnvelope(envelope: SyncEnvelope): void {
  const common=['protocolVersion','operationId','userId','baseRevision','kind'];
  assertFields(envelope,envelope.kind==='bootstrap'?[...common,'source','data','coveredOperations']:[...common,'operation']);
  if(envelope.protocolVersion!==1) throw new TypeError('Protocolo de sincronização não suportado.');
  assertEntityId(envelope.userId); assertEntityId(envelope.operationId); assertRevision(envelope.baseRevision); assertSize(envelope);
  const validateWire=(wire:WireOperation)=>{
    assertFields(wire,['id','userId','kind','createdAt','payload']);
    assertPendingOperation({id:wire.id,userId:wire.userId,kind:wire.kind,createdAt:wire.createdAt,payloadJson:JSON.stringify(wire.payload)},envelope.userId);
  };
  if(envelope.kind==='bootstrap') {
    assertFields(envelope.source,['ownerId','digest']); assertEntityId(envelope.source.ownerId);
    if(!/^[0-9a-f]{64}$/.test(envelope.source.digest)||!Array.isArray(envelope.coveredOperations)) throw new TypeError('Proveniência da associação inválida.');
    const data=envelopeData(envelope);
    for(const operation of envelope.coveredOperations) validateWire(operation);
    validateI2Backup(serializeLocalBackup({...data,outbox:envelope.coveredOperations.map((operation)=>({id:operation.id,userId:operation.userId,kind:operation.kind,createdAt:operation.createdAt,payloadJson:JSON.stringify(operation.payload)}))},envelope.userId,'2000-01-01T00:00:00.000Z'));
  } else {
    validateWire(envelope.operation);
    if(envelope.kind!==envelope.operation.kind||envelope.operationId!==envelope.operation.id) throw new TypeError('Identidade de comando divergente.');
    envelopeData(envelope);
  }
}

export function assertFields(value: unknown,fields: readonly string[]): void {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some((key)=>!fields.includes(key))||fields.some((key)=>!Object.hasOwn(value,key))) throw new TypeError('Campos de protocolo ausentes ou não suportados.');
}

export async function receiptAcknowledges(envelope: SyncEnvelope, receipt: Receipt): Promise<boolean> {
  assertFields(receipt,['protocolVersion','userId','operationId','revision','digest','coveredOperations']);
  assertEntityId(receipt.operationId);
  if(!Array.isArray(receipt.coveredOperations)) return false;
  for(const covered of receipt.coveredOperations) { assertFields(covered,['id','digest']); assertEntityId(covered.id); if(!/^[0-9a-f]{64}$/.test(covered.digest)) return false; }
  if (receipt.protocolVersion !== 1 || receipt.userId !== envelope.userId) return false;
  assertRevision(receipt.revision);
  if (receipt.revision === '0' || !/^[0-9a-f]{64}$/.test(receipt.digest)) return false;
  if (receipt.operationId === envelope.operationId) {
    if(receipt.digest!==await jsonDigest(envelope)) return false;
    const coverage=envelope.kind==='bootstrap'?await Promise.all(envelope.coveredOperations.map(async(operation)=>({id:operation.id,digest:await jsonDigest(operation)}))):[];
    return canonicalJson(receipt.coveredOperations)===canonicalJson(coverage);
  }
  if (envelope.kind === 'bootstrap') return false;
  const covered = receipt.coveredOperations.find((row) => row.id === envelope.operationId);
  return covered?.digest === await jsonDigest(envelope.operation);
}
