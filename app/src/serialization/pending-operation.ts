import { assertEntityId, type PendingOperation } from '../domain';

export function assertPendingOperation(operation: PendingOperation, userId: string): void {
  assertEntityId(operation.id, 'Operação pendente');
  assertEntityId(operation.userId, 'Proprietário da operação');
  if (operation.userId !== userId) throw new TypeError('A operação pendente pertence a outro usuário.');
  const kinds = ['create_account', 'create_category', 'record_event', 'reverse_event', 'replace_event', 'reconcile_account', 'manage_entity'];
  if (!kinds.includes(operation.kind)) throw new TypeError('Tipo de operação pendente inválido.');
  if (typeof operation.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(operation.createdAt)) {
    throw new TypeError('Instante da operação pendente inválido.');
  }
  const timestamp = Date.parse(operation.createdAt);
  const canonical = operation.createdAt.includes('.') ? operation.createdAt : operation.createdAt.replace('Z', '.000Z');
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== canonical) throw new TypeError('Instante da operação pendente inválido.');
  if (typeof operation.payloadJson !== 'string' || operation.payloadJson.length < 2 || operation.payloadJson.length > 1_000_000) {
    throw new TypeError('Payload da operação pendente inválido.');
  }
  const payload = JSON.parse(operation.payloadJson) as unknown;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)
    || (payload as Record<string, unknown>).userId !== userId
    || (payload as Record<string, unknown>).schemaVersion !== 1) {
    throw new TypeError('Payload da operação pendente não corresponde ao proprietário ou schema esperado.');
  }
  if(operation.kind==='manage_entity') {
    const root=payload as Record<string,unknown>,change=root.lifecycleChange;
    if(!change||typeof change!=='object'||Array.isArray(change))throw new TypeError('Alteração versionada ausente.');
    const row=change as Record<string,unknown>,entity=row.entity;
    const allowed=['entity','entityId','expectedVersion','nextState','metadata'];
    if(Object.keys(row).some(key=>!allowed.includes(key))||allowed.some(key=>!Object.hasOwn(row,key)))throw new TypeError('Campos da alteração versionada inválidos.');
    assertEntityId(row.entityId,'Entidade versionada');
    if(entity!=='account'&&entity!=='category')throw new TypeError('Tipo de entidade inválido.');
    if(!Number.isSafeInteger(row.expectedVersion)||(row.expectedVersion as number)<0)throw new TypeError('Versão esperada inválida.');
    if(row.nextState!=='active'&&row.nextState!=='archived')throw new TypeError('Estado de entidade inválido.');
    if(!row.metadata||typeof row.metadata!=='object'||Array.isArray(row.metadata))throw new TypeError('Metadados versionados inválidos.');
    const metadata=row.metadata as Record<string,unknown>;
    if(typeof metadata.name!=='string'||!metadata.name.trim()||metadata.name.length>120)throw new TypeError('Nome de entidade inválido.');
    const keys=entity==='account'?['name','kind','availability']:['name','kind','parentId'];
    if(Object.keys(metadata).some(key=>!keys.includes(key))||!Object.hasOwn(metadata,'name')||!Object.hasOwn(metadata,'kind'))throw new TypeError('Campos de metadados inválidos.');
    if(entity==='account') {
      if(!['checking','savings','cash','digital','transport','investment','other'].includes(String(metadata.kind))
        ||!['free','reserved','restricted'].includes(String(metadata.availability)))throw new TypeError('Metadados de conta inválidos.');
      if(metadata.kind==='transport'&&metadata.availability!=='restricted')throw new TypeError('Conta de transporte deve ter uso restrito.');
    } else {
      if(!['income','expense','both'].includes(String(metadata.kind)))throw new TypeError('Metadados de categoria inválidos.');
      if(metadata.parentId!==undefined)assertEntityId(metadata.parentId,'Categoria superior');
    }
  }
}
