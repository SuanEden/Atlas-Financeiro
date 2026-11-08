import { assertEntityId, type LocalFinancialState } from '../domain';
import { serializeFinancialDataset } from '../serialization';
import { assertPendingOperation } from '../serialization/pending-operation';
import { validateBankLinks } from './bank-links';

export const LOCAL_BACKUP_SCHEMA_VERSION = 3 as const;

/** I2-compatible export. Limited empty-origin recovery is separate; full restore remains I4. */
export function serializeLocalBackup(state: LocalFinancialState, userId: string, exportedAt = new Date().toISOString(), rawBankLinks: unknown = {}): string {
  assertEntityId(userId, 'Proprietário do backup');
  if (!Number.isFinite(Date.parse(exportedAt))) throw new TypeError('Instante da exportação inválido.');
  const operationIds = new Set<string>();
  for (const operation of state.outbox) {
    assertPendingOperation(operation, userId);
    if (operationIds.has(operation.id)) throw new TypeError('Operação pendente duplicada no backup.');
    operationIds.add(operation.id);
  }
  const bankLinks = validateBankLinks(rawBankLinks, new Set(state.accounts.map(account => account.id)));
  const dataset = JSON.parse(serializeFinancialDataset(state, userId)) as Record<string, unknown>;
  // Local I2 exports do not own the cloud-only lifecycle ledger; keep this export boundary explicit.
  delete dataset.entityLifecycles;
  dataset.schemaVersion=3;
  const outbox = state.outbox.map((operation) => ({
    id: operation.id,
    userId: operation.userId,
    kind: operation.kind,
    createdAt: operation.createdAt,
    payload: JSON.parse(operation.payloadJson) as unknown,
  }));
  return JSON.stringify({
    format: 'atlas-financeiro-local-backup',
    schemaVersion: LOCAL_BACKUP_SCHEMA_VERSION,
    exportedAt,
    userId,
    manifest: {
      financialSchemaVersion: dataset.schemaVersion,
      accounts: state.accounts.length,
      categories: state.categories.length,
      events: state.events.length,
      settlements: state.settlements.length,
      postings: state.postings.length,
      accountReconciliations: (state.accountReconciliations ?? []).length,
      pendingOperations: state.outbox.length,
      attachmentsIncluded: false,
      bankLinks: Object.keys(bankLinks).length,
    },
    data: dataset,
    outbox,
    bankLinks,
  }, null, 2);
}

export function backupFilename(date: string): string {
  return `atlas-financeiro-backup-${date}.json`;
}

