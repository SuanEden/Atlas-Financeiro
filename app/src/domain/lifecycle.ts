/**
 * P03: append-only lifecycle projection. This module is deliberately independent
 * from v1 I3 envelopes and financial ledger mutation. Until the server implements
 * a versioned operation/receipt protocol, never transmit these events.
 */
import { assertEntityId } from './validation';

export type LifecycleEntity = 'account' | 'category';
export type LifecycleState = 'active' | 'archived';

export interface LifecycleChange {
  operationId: string;
  ownerId: string;
  entity: LifecycleEntity;
  entityId: string;
  expectedVersion: number;
  nextState: LifecycleState;
}

export interface LifecycleRecord extends LifecycleChange {
  /** Assigned only when the authoritative server validates expectedVersion. */
  version: number;
  /** Monotonic owner-wide feed revision, not a device timestamp. */
  revision: number;
}

export class LifecycleConflict extends Error {
  constructor(readonly currentVersion: number) {
    super('Versão de arquivamento desatualizada. Sincronize antes de tentar novamente.');
    this.name = 'LifecycleConflict';
  }
}

function nonnegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(label + ' inválida.');
}

function assertChange(change: LifecycleChange): void {
  assertEntityId(change.operationId,'ID da alteração');
  assertEntityId(change.ownerId,'Proprietário');
  assertEntityId(change.entityId,'Entidade');
  if (change.entity !== 'account' && change.entity !== 'category')
    throw new TypeError('Tipo de entidade inválido.');
  if (change.nextState !== 'active' && change.nextState !== 'archived')
    throw new TypeError('Estado de arquivamento inválido.');
  nonnegativeInteger(change.expectedVersion,'Versão esperada');
}

function sameChange(existing: LifecycleRecord, incoming: LifecycleChange): boolean {
  return existing.operationId === incoming.operationId
    && existing.ownerId === incoming.ownerId
    && existing.entity === incoming.entity
    && existing.entityId === incoming.entityId
    && existing.expectedVersion === incoming.expectedVersion
    && existing.nextState === incoming.nextState;
}

export function currentLifecycle(
  history: readonly LifecycleRecord[],
  ownerId: string,
  entity: LifecycleEntity,
  entityId: string,
): { version: number; state: LifecycleState } {
  let result: {version:number;state:LifecycleState}={version:0,state:'active'};
  for (const record of history) {
    if (record.ownerId===ownerId && record.entity===entity && record.entityId===entityId &&
        record.version>result.version) result={version:record.version,state:record.nextState};
  }
  return result;
}

/**
 * Pure server-side decision model. An implementation must lock the entity row
 * and persist the decision plus sync receipt atomically before broadcasting.
 * This helper alone does not authorize or perform a write to Supabase.
 */
export function decideLifecycleChange(
  history: readonly LifecycleRecord[],
  change: LifecycleChange,
  nextRevision: number,
  entityExists: boolean,
): {record:LifecycleRecord;created:boolean} {
  assertChange(change);
  nonnegativeInteger(nextRevision,'Revisão');
  if (nextRevision === 0) throw new TypeError('A revisão deve ser positiva.');
  const reused=history.find(row=>row.operationId===change.operationId);
  if (reused) {
    if (!sameChange(reused,change)) throw new TypeError('Identificador reutilizado com conteúdo divergente.');
    return {record:reused,created:false};
  }
  if (!entityExists) throw new TypeError('Conta ou categoria não encontrada no proprietário.');
  const latest=currentLifecycle(history,change.ownerId,change.entity,change.entityId);
  if (latest.version!==change.expectedVersion) throw new LifecycleConflict(latest.version);
  if (latest.state===change.nextState) throw new TypeError('A entidade já está no estado solicitado.');
  if (history.some(row=>row.ownerId===change.ownerId&&row.revision===nextRevision))
    throw new TypeError('Revisão global já utilizada.');
  return {record:{...change,version:latest.version+1,revision:nextRevision},created:true};
}

/** Strict feed application prevents a late device from resurrecting an archive. */
export function incorporateLifecyclePage(
  history: readonly LifecycleRecord[],
  incoming: readonly LifecycleRecord[],
  ownerId: string,
): LifecycleRecord[] {
  assertEntityId(ownerId,'Proprietário');
  const result=[...history];
  for (const record of incoming) {
    assertChange(record);
    nonnegativeInteger(record.version,'Versão');
    nonnegativeInteger(record.revision,'Revisão');
    if (record.version === 0 || record.revision === 0 || record.ownerId!==ownerId)
      throw new TypeError('Evento de arquivamento de outro proprietário ou versão inválida.');
    const reused=result.find(row=>row.operationId===record.operationId);
    if(reused) {
      if (!sameChange(reused,record)||reused.version!==record.version||reused.revision!==record.revision)
        throw new TypeError('Evento de arquivamento divergente para o mesmo ID.');
      continue;
    }
    const latest=currentLifecycle(result,ownerId,record.entity,record.entityId);
    if (record.expectedVersion!==latest.version || record.version!==latest.version+1)
      throw new LifecycleConflict(latest.version);
    if (result.some(row=>row.ownerId===ownerId&&row.revision===record.revision))
      throw new TypeError('Revisão repetida com outro evento.');
    result.push({...record});
  }
  return result;
}

export function isEntitySelectable(
  history: readonly LifecycleRecord[],
  ownerId:string,entity:LifecycleEntity,entityId:string,
):boolean {
  return currentLifecycle(history,ownerId,entity,entityId).state==='active';
}
