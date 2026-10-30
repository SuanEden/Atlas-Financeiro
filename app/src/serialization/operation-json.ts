import { assertEntityId, encodeCents, type FinancialDataset } from '../domain';
import type { FinancialAggregate } from '../persistence/local-financial-store';

export const OPERATION_JSON_SCHEMA_VERSION = 1 as const;

/** Creates a minimal, explicit JSON payload for a future idempotent RPC. */
export function serializeOperationPayload(aggregate: FinancialAggregate, userId: string): string {
  assertEntityId(userId, 'Proprietário da operação');
  const payload: Record<string, unknown> = {
    schemaVersion: OPERATION_JSON_SCHEMA_VERSION,
    userId,
  };
  if (aggregate.accounts !== undefined) payload.accounts = aggregate.accounts.map((row) => pickAccount(row));
  if (aggregate.categories !== undefined) payload.categories = aggregate.categories.map((row) => pickCategory(row));
  if (aggregate.events !== undefined) payload.events = aggregate.events.map((row) => pickEvent(row));
  if (aggregate.settlements !== undefined) payload.settlements = aggregate.settlements.map((row) => pickSettlement(row));
  if (aggregate.postings !== undefined) payload.postings = aggregate.postings.map((row) => pickPosting(row));
  return JSON.stringify(payload);
}

function pickAccount(row: FinancialDataset['accounts'][number]) {
  return { id: row.id, userId: row.userId, name: row.name, kind: row.kind, availability: row.availability };
}

function pickCategory(row: FinancialDataset['categories'][number]) {
  return { id: row.id, userId: row.userId, name: row.name, kind: row.kind, parentId: row.parentId };
}

function pickEvent(row: FinancialDataset['events'][number]) {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    source: row.source,
    status: row.status,
    certainty: row.certainty,
    amountCents: encodeCents(row.amountCents),
    accountId: row.accountId,
    transferAccountId: row.transferAccountId,
    categoryId: row.categoryId,
    description: row.description,
    competenceDate: row.competenceDate,
    dueDate: row.dueDate,
    adjustmentDirection: row.adjustmentDirection,
    reversesEventId: row.reversesEventId,
    replacesEventId: row.replacesEventId,
  };
}

function pickSettlement(row: FinancialDataset['settlements'][number]) {
  return {
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    amountCents: encodeCents(row.amountCents),
    paymentDate: row.paymentDate,
    settlementDate: row.settlementDate,
  };
}

function pickPosting(row: FinancialDataset['postings'][number]) {
  return {
    id: row.id,
    userId: row.userId,
    settlementId: row.settlementId,
    accountId: row.accountId,
    amountCents: encodeCents(row.amountCents),
  };
}
