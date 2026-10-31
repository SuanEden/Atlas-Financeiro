import { assertEntityId, type FinancialDataset, type LocalFinancialState, type PendingOperation } from '../domain';
import { deserializeFinancialDataset, serializeFinancialDataset } from '../serialization';
import { canonicalJson } from '../serialization/canonical-json';
import { assertPendingOperation } from '../serialization/pending-operation';

export const MAX_I2_BACKUP_BYTES = 10 * 1024 * 1024;
const TABLES = ['accounts', 'categories', 'events', 'settlements', 'postings', 'accountReconciliations'] as const;
type JsonObject = Record<string, unknown>;

export interface ValidatedI2Backup {
  userId: string;
  exportedAt: string;
  state: LocalFinancialState;
}

export function readObject(value: unknown, keys: readonly string[]): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Esperado objeto no arquivo.');
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new TypeError(`Campo não suportado no arquivo: ${key}.`);
  return value as JsonObject;
}

/** Accepts only the export-only I2 format. Does not import credentials or an authenticated owner. */
export function validateI2Backup(json: string): ValidatedI2Backup {
  if (new TextEncoder().encode(json).byteLength > MAX_I2_BACKUP_BYTES) throw new RangeError('O arquivo excede o limite de 10 MiB.');
  const root = readObject(JSON.parse(json), ['format', 'schemaVersion', 'exportedAt', 'userId', 'manifest', 'data', 'outbox']);
  if (root.format !== 'atlas-financeiro-local-backup' || root.schemaVersion !== 1 && root.schemaVersion !== 2) throw new TypeError('Formato ou versão de backup não suportados. Selecione uma exportação de I2.');
  assertEntityId(root.userId, 'Proprietário de origem');
  if (typeof root.exportedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(root.exportedAt)
    || !Number.isFinite(Date.parse(root.exportedAt)) || new Date(root.exportedAt).toISOString() !== root.exportedAt) throw new TypeError('Data de exportação inválida.');
  const rawData = readObject(root.data, ['schemaVersion', 'userId', ...TABLES]);
  let records = 0;
  for (const table of TABLES) {
    const rows = rawData[table];
    if (rows === undefined && root.schemaVersion === 1 && table === 'accountReconciliations') continue;
    if (!Array.isArray(rows)) throw new TypeError('Coleção financeira inválida.');
    records += rows.length;
    if (['events', 'settlements', 'postings', 'accountReconciliations'].includes(table)) {
      for (const row of rows) {
        const amount = table === 'accountReconciliations' ? row?.balanceCents : row?.amountCents;
        if (typeof amount !== 'string' || !/^-?(?:0|[1-9]\d{0,10})$/.test(amount)) throw new TypeError('Centavos inválidos no arquivo.');
      }
    }
  }
  if (records > 50_000) throw new RangeError('O arquivo excede 50 mil registros; nenhuma gravação foi feita.');
  const data = deserializeFinancialDataset(JSON.stringify(root.data), root.userId);
  if (!Array.isArray(root.outbox)) throw new TypeError('A lista de operações pendentes é obrigatória.');
  const manifest = readObject(root.manifest, ['financialSchemaVersion', ...TABLES, 'pendingOperations', 'attachmentsIncluded']);
  const financialRoot = root.data as JsonObject;
  if (manifest.financialSchemaVersion !== financialRoot.schemaVersion || manifest.attachmentsIncluded !== false) throw new TypeError('Manifesto incompatível com a exportação de I2.');
  for (const table of TABLES) {
    if (root.schemaVersion === 1 && table === 'accountReconciliations') continue;
    if (manifest[table] !== (data[table] ?? []).length) throw new TypeError(`Contagem divergente: ${table}.`);
  }
  if (manifest.pendingOperations !== root.outbox.length) throw new TypeError('Contagem de pendências divergente.');
  const canonicalData = JSON.parse(serializeFinancialDataset(data, root.userId)) as JsonObject;
  const indexes = Object.fromEntries(TABLES.map((table) => [table,
    new Map(((canonicalData[table] ?? []) as JsonObject[]).map((row) => [row.id, canonicalJson(row)])),
  ])) as Record<typeof TABLES[number], Map<unknown, string>>;
  const ids = new Set<string>();
  const ownedRows = new Set<string>();
  const outbox = root.outbox.map((raw): PendingOperation => {
    const row = readObject(raw, ['id', 'userId', 'kind', 'createdAt', 'payload']);
    // Types are checked by the persistence boundary before this object is returned.
    const operation = { id: row.id, userId: row.userId, kind: row.kind, createdAt: row.createdAt, payloadJson: JSON.stringify(row.payload) } as PendingOperation;
    assertPendingOperation(operation, root.userId as string);
    if (ids.has(operation.id)) throw new TypeError('Identificador de operação duplicado.');
    ids.add(operation.id);
    const payload = readObject(row.payload, ['schemaVersion', 'userId', ...TABLES]);
    let rowCount = 0;
    for (const table of TABLES) {
      if (!(table in payload)) continue;
      const rows = payload[table];
      if (!Array.isArray(rows)) throw new TypeError('Coleção inválida na operação pendente.');
      for (const entry of rows) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new TypeError('Registro inválido na operação.');
        const id = (entry as JsonObject).id;
        const key = `${table}:${String(id)}`;
        if (indexes[table].get(id) !== canonicalJson(entry)) throw new TypeError('Operação pendente diverge dos registros do arquivo.');
        if (ownedRows.has(key)) throw new TypeError('Duas operações não podem reenviar o mesmo registro.');
        ownedRows.add(key);
        rowCount++;
      }
    }
    if (rowCount === 0) throw new TypeError('Operação sem registros.');
    assertOperationKind(operation.kind, payload);
    assertCompleteOperation(payload, data);
    return operation;
  });
  return { userId: root.userId, exportedAt: root.exportedAt, state: { ...data, outbox } };
}

function assertOperationKind(kind: PendingOperation['kind'], payload: JsonObject): void {
  const accounts = (payload.accounts ?? []) as JsonObject[];
  const categories = (payload.categories ?? []) as JsonObject[];
  const events = (payload.events ?? []) as JsonObject[];
  const settlements = (payload.settlements ?? []) as JsonObject[];
  const postings = (payload.postings ?? []) as JsonObject[];
  const reconciliations = (payload.accountReconciliations ?? []) as JsonObject[];
  const fail = () => { throw new TypeError('Tipo de operação incompatível com seus registros.'); };
  if (kind === 'create_account') {
    if (accounts.length !== 1 || categories.length || events.length > 1 || reconciliations.length > 1 || reconciliations.some((row) => row.accountId !== accounts[0]?.id) || events.some((row) => row.source !== 'opening_balance' || row.accountId !== accounts[0]?.id)) fail();
    if (!events.length && (settlements.length || postings.length)) fail();
  } else if (kind === 'reconcile_account') {
    if (accounts.length || categories.length || reconciliations.length !== 1 || events.length > 1 || events.some((row) => row.source !== 'opening_balance' || row.kind !== 'adjustment' || row.accountId !== reconciliations[0]?.accountId || row.id !== reconciliations[0]?.eventId)) fail();
  } else if (kind === 'create_category') {
    if (categories.length !== 1 || accounts.length || events.length || settlements.length || postings.length) fail();
  } else {
    if (accounts.length || categories.length || reconciliations.length) fail();
    if (kind === 'record_event' && (events.length !== 1 || events.some((row) => row.reversesEventId || row.replacesEventId || row.source !== 'manual'))) fail();
    if (kind === 'reverse_event' && (events.length !== 1 || !events.some((row) => row.reversesEventId || (row.status === 'cancelled' && row.replacesEventId)))) fail();
    if (kind === 'replace_event' && (events.length < 1 || events.length > 2 || events.filter((row) => row.replacesEventId).length !== 1
      || events.some((row) => !row.reversesEventId && !row.replacesEventId))) fail();
  }
}

function assertCompleteOperation(payload: JsonObject, data: FinancialDataset): void {
  const settlements = (payload.settlements ?? []) as JsonObject[];
  const postings = (payload.postings ?? []) as JsonObject[];
  const events = (payload.events ?? []) as JsonObject[];
  for (const event of events) {
    const expected = data.settlements.filter((row) => row.eventId === event.id);
    if (expected.some((row) => !settlements.some((item) => item.id === row.id))) throw new TypeError('Operação com liquidação incompleta.');
  }
  for (const settlement of settlements) {
    if (!events.some((row) => row.id === settlement.eventId)) throw new TypeError('Liquidação sem evento no mesmo comando.');
    const expected = data.postings.filter((row) => row.settlementId === settlement.id);
    if (expected.some((row) => !postings.some((item) => item.id === row.id))) throw new TypeError('Operação com contrapartidas incompletas.');
  }
  if (postings.some((posting) => !settlements.some((row) => row.id === posting.settlementId))) throw new TypeError('Contrapartida sem liquidação no comando.');
}

export function canonicalLocalState(state: LocalFinancialState, userId: string): string {
  const data = JSON.parse(serializeFinancialDataset(state, userId)) as JsonObject;
  for (const table of TABLES) ((data[table] ?? []) as JsonObject[]).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return canonicalJson({ data, outbox: state.outbox.map((row) => ({ ...row, payloadJson: canonicalJson(JSON.parse(row.payloadJson)) }))
    .sort((a, b) => a.id.localeCompare(b.id)) });
}
