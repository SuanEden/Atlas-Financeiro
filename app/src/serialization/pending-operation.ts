import { assertEntityId, type PendingOperation } from '../domain';

export function assertPendingOperation(operation: PendingOperation, userId: string): void {
  assertEntityId(operation.id, 'Operação pendente');
  assertEntityId(operation.userId, 'Proprietário da operação');
  if (operation.userId !== userId) throw new TypeError('A operação pendente pertence a outro usuário.');
  const kinds = ['create_account', 'create_category', 'record_event', 'reverse_event', 'replace_event'];
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
}
