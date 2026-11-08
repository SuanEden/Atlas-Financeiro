import { assertEntityId } from './validation';
import type {
  AccountLifecycleMetadata, CategoryLifecycleMetadata, EntityLifecycleRecord,
  FinancialDataset, LifecycleEntity, LifecycleMetadata, LifecycleState,
} from './models';

export type { EntityLifecycleRecord, LifecycleEntity, LifecycleState } from './models';
export type LifecycleChange = Omit<EntityLifecycleRecord,'version'|'revision'>;
export type LifecycleRecord = EntityLifecycleRecord;

export class LifecycleConflict extends Error {
  constructor(readonly currentVersion:number) {
    super('A conta ou categoria foi alterada em outro dispositivo. Sincronize e tente novamente.');
    this.name='LifecycleConflict';
  }
}

function assertMetadata(entity:LifecycleEntity,metadata:LifecycleMetadata):void {
  if(!metadata||typeof metadata!=='object'||Array.isArray(metadata))throw new TypeError('Metadados da entidade inválidos.');
  if(typeof metadata.name!=='string'||!metadata.name.trim()||metadata.name.trim().length>120)throw new TypeError('Informe um nome de até 120 caracteres.');
  if(entity==='account') {
    const value=metadata as AccountLifecycleMetadata;
    if(!['checking','savings','cash','digital','transport','investment','other'].includes(value.kind))throw new TypeError('Tipo de conta inválido.');
    if(!['free','reserved','restricted'].includes(value.availability))throw new TypeError('Disponibilidade da conta inválida.');
    if(value.kind==='transport'&&value.availability!=='restricted')throw new TypeError('Conta de transporte deve ter uso restrito.');
    if(Object.keys(value).some(k=>!['name','kind','availability'].includes(k)))throw new TypeError('Metadados de conta contêm campos desconhecidos.');
  } else {
    const value=metadata as CategoryLifecycleMetadata;
    if(!['income','expense','both'].includes(value.kind))throw new TypeError('Tipo de categoria inválido.');
    if(value.parentId!==undefined)assertEntityId(value.parentId,'Categoria superior');
    if(Object.keys(value).some(k=>!['name','kind','parentId'].includes(k)))throw new TypeError('Metadados de categoria contêm campos desconhecidos.');
  }
}

function assertChange(change:LifecycleChange):void {
  assertEntityId(change.operationId,'ID da alteração');assertEntityId(change.userId,'Proprietário');assertEntityId(change.entityId,'Entidade');
  if(change.entity!=='account'&&change.entity!=='category')throw new TypeError('Tipo de entidade inválido.');
  if(change.nextState!=='active'&&change.nextState!=='archived')throw new TypeError('Estado de arquivamento inválido.');
  if(!Number.isSafeInteger(change.expectedVersion)||change.expectedVersion<0)throw new TypeError('Versão esperada inválida.');
  assertMetadata(change.entity,change.metadata);
}

function sameJson(a:unknown,b:unknown):boolean {
  return JSON.stringify(a,Object.keys((a&&typeof a==='object'?a:{}) as object).sort())===JSON.stringify(b,Object.keys((b&&typeof b==='object'?b:{}) as object).sort());
}

function sameChange(a:LifecycleRecord,b:LifecycleChange):boolean {
  return a.operationId===b.operationId&&a.userId===b.userId&&a.entity===b.entity&&a.entityId===b.entityId
    &&a.expectedVersion===b.expectedVersion&&a.nextState===b.nextState&&sameJson(a.metadata,b.metadata);
}

export function currentLifecycle(history:readonly LifecycleRecord[],userId:string,entity:LifecycleEntity,entityId:string):{
  version:number;state:LifecycleState;metadata?:LifecycleMetadata;
} {
  let current:{version:number;state:LifecycleState;metadata?:LifecycleMetadata}={version:0,state:'active'};
  for(const row of history)if(row.userId===userId&&row.entity===entity&&row.entityId===entityId&&row.version>current.version)
    current={version:row.version,state:row.nextState,metadata:structuredClone(row.metadata)};
  return current;
}

export function decideLifecycleChange(
  history:readonly LifecycleRecord[],change:LifecycleChange,nextRevision:number,entityExists:boolean,
):{record:LifecycleRecord;created:boolean} {
  assertChange(change);
  if(!Number.isSafeInteger(nextRevision)||nextRevision<=0)throw new TypeError('Revisão global inválida.');
  const prior=history.find(row=>row.operationId===change.operationId);
  if(prior) {
    if(!sameChange(prior,change))throw new TypeError('Identificador reutilizado com conteúdo divergente.');
    return {record:prior,created:false};
  }
  if(!entityExists)throw new TypeError('Conta ou categoria não encontrada no proprietário.');
  const current=currentLifecycle(history,change.userId,change.entity,change.entityId);
  if(current.version!==change.expectedVersion)throw new LifecycleConflict(current.version);
  if(current.state===change.nextState&&current.metadata&&sameJson(current.metadata,change.metadata))
    throw new TypeError('A entidade já possui os dados e o estado solicitados.');
  const lastRevision=history.filter(row=>row.userId===change.userId).reduce((max,row)=>Math.max(max,row.revision),0);
  if(nextRevision<=lastRevision)throw new TypeError('Revisão global não avança monotonicamente.');
  return {record:{...structuredClone(change),version:current.version+1,revision:nextRevision},created:true};
}

/** Validates and incorporates a complete ordered lifecycle feed. revision=0 is reserved for local outbox projection. */
export function incorporateLifecyclePage(
  history:readonly LifecycleRecord[],incoming:readonly LifecycleRecord[],userId:string,allowPending=false,
):LifecycleRecord[] {
  assertEntityId(userId,'Proprietário');
  const result=[...history];
  for(const record of incoming) {
    assertChange(record);
    if(record.userId!==userId||!Number.isSafeInteger(record.version)||record.version<=0
      ||!Number.isSafeInteger(record.revision)||record.revision<0||(!allowPending&&record.revision===0))
      throw new TypeError('Registro de versão de outro proprietário ou inválido.');
    const reused=result.find(row=>row.operationId===record.operationId);
    if(reused) {
      if(!sameChange(reused,record)||reused.version!==record.version||reused.revision!==record.revision)
        throw new TypeError('Evento de versão divergente para o mesmo ID.');
      continue;
    }
    const current=currentLifecycle(result,userId,record.entity,record.entityId);
    if(record.expectedVersion!==current.version||record.version!==current.version+1)throw new LifecycleConflict(current.version);
    if(current.state===record.nextState&&current.metadata&&sameJson(current.metadata,record.metadata))
      throw new TypeError('Feed contém alteração sem mudança de metadados ou estado.');
    if(record.revision>0) {
      const last=result.filter(row=>row.userId===userId).reduce((max,row)=>Math.max(max,row.revision),0);
      if(record.revision<=last||result.some(row=>row.userId===userId&&row.revision===record.revision))
        throw new TypeError('Feed de versões fora de ordem ou com revisão repetida.');
    } else if(!allowPending) throw new TypeError('Revisão local pendente não pode ser incorporada ao histórico confirmado.');
    result.push(structuredClone(record));
  }
  return result;
}

export function isEntitySelectable(history:readonly LifecycleRecord[],userId:string,entity:LifecycleEntity,entityId:string):boolean {
  return currentLifecycle(history,userId,entity,entityId).state==='active';
}

/** Apply the latest immutable metadata snapshot to a display projection, never to the confirmed base rows. */
export function applyLifecycleMetadata(dataset:FinancialDataset,userId:string):FinancialDataset {
  const result=structuredClone(dataset);
  for(const entity of ['account','category'] as const) {
    const ids=new Set((entity==='account'?result.accounts:result.categories).map(row=>row.id));
    for(const id of ids) {
      const current=currentLifecycle(result.entityLifecycles??[],userId,entity,id);
      if(!current.metadata)continue;
      if(entity==='account') {
        const row=result.accounts.find(item=>item.id===id)!;const metadata=current.metadata as AccountLifecycleMetadata;
        row.name=metadata.name;row.kind=metadata.kind;row.availability=metadata.availability;
      } else {
        const row=result.categories.find(item=>item.id===id)!;const metadata=current.metadata as CategoryLifecycleMetadata;
        row.name=metadata.name;row.kind=metadata.kind;
        if(metadata.parentId===undefined)delete row.parentId;else row.parentId=metadata.parentId;
      }
    }
  }
  return result;
}
