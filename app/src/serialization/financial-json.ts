import {
  assertFinancialDataset,
  decodeCents,
  encodeCents,
  type Account,
  type Category,
  type FinancialDataset,
  type FinancialEvent,
  type Posting,
  type Settlement,
} from '../domain';

export const FINANCIAL_JSON_SCHEMA_VERSION = 2 as const;

/**
 * A versioned data representation for the local foundation and its tests.
 * This is not a backup/restore workflow and deliberately excludes credentials,
 * synchronization metadata and browser state.
 */
export function serializeFinancialDataset(dataset: FinancialDataset, userId: string): string {
  assertFinancialDataset(dataset, userId);
  return JSON.stringify({
    schemaVersion: FINANCIAL_JSON_SCHEMA_VERSION,
    userId,
    accounts: dataset.accounts.map((account) => ({
      id: account.id,
      userId: account.userId,
      name: account.name,
      kind: account.kind,
      availability: account.availability,
    })),
    categories: dataset.categories.map((category) => ({
      id: category.id,
      userId: category.userId,
      name: category.name,
      kind: category.kind,
      parentId: category.parentId,
    })),
    events: dataset.events.map((event) => ({
      id: event.id,
      userId: event.userId,
      kind: event.kind,
      status: event.status,
      source: event.source,
      amountCents: encodeCents(event.amountCents),
      accountId: event.accountId,
      transferAccountId: event.transferAccountId,
      categoryId: event.categoryId,
      description: event.description,
      competenceDate: event.competenceDate,
      dueDate: event.dueDate,
      certainty: event.certainty,
      adjustmentDirection: event.adjustmentDirection,
      reversesEventId: event.reversesEventId,
      replacesEventId: event.replacesEventId,
    })),
    settlements: dataset.settlements.map((settlement) => ({
      id: settlement.id,
      userId: settlement.userId,
      eventId: settlement.eventId,
      amountCents: encodeCents(settlement.amountCents),
      paymentDate: settlement.paymentDate,
      settlementDate: settlement.settlementDate,
    })),
    postings: dataset.postings.map((posting) => ({
      id: posting.id,
      userId: posting.userId,
      settlementId: posting.settlementId,
      accountId: posting.accountId,
      amountCents: encodeCents(posting.amountCents),
    })),
  });
}

export function deserializeFinancialDataset(json: string, expectedUserId: string): FinancialDataset {
  if (typeof json !== 'string') throw new TypeError('A representação financeira deve ser texto JSON.');
  const root = readObject(JSON.parse(json) as unknown, [
    'schemaVersion', 'userId', 'accounts', 'categories', 'events', 'settlements', 'postings',
  ]);
  if (root.schemaVersion !== 1 && root.schemaVersion !== FINANCIAL_JSON_SCHEMA_VERSION) {
    throw new TypeError('Versão da representação financeira não suportada.');
  }
  if (readString(root, 'userId') !== expectedUserId) {
    throw new TypeError('A representação pertence a outro usuário local.');
  }
  const dataset: FinancialDataset = {
    accounts: readCollection(root, 'accounts', readAccount),
    categories: readCollection(root, 'categories', readCategory),
    events: readCollection(root, 'events', readEvent),
    settlements: readCollection(root, 'settlements', readSettlement),
    postings: readCollection(root, 'postings', readPosting),
  };
  assertFinancialDataset(dataset, expectedUserId);
  return dataset;
}

type JsonObject = Record<string, unknown>;

function readObject(value: unknown, allowedKeys: readonly string[]): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Objeto financeiro inválido.');
  }
  const record = value as JsonObject;
  for (const key of Object.keys(record)) {
    if (!allowedKeys.includes(key)) throw new TypeError(`Campo financeiro desconhecido: ${key}.`);
  }
  return record;
}

function readString(record: JsonObject, key: string): string {
  const value = record[key];
  if (typeof value !== 'string') throw new TypeError(`O campo ${key} deve ser texto.`);
  return value;
}

function readEnum<const T extends readonly string[]>(record: JsonObject, key: string, values: T): T[number] {
  const value = record[key];
  for (const allowed of values) {
    if (value === allowed) return allowed;
  }
  throw new TypeError(`O campo ${key} tem valor não permitido.`);
}

function readOptionalString<K extends string>(record: JsonObject, key: K): Partial<Record<K, string>> {
  if (!Object.hasOwn(record, key)) return {};
  return { [key]: readString(record, key) } as Record<K, string>;
}

function readCommon(record: JsonObject): { id: string; userId: string } {
  return { id: readString(record, 'id'), userId: readString(record, 'userId') };
}

function readCollection<T>(record: JsonObject, key: string, readItem: (item: unknown) => T): T[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new TypeError(`A coleção ${key} deve ser um array.`);
  return value.map(readItem);
}

function readAccount(value: unknown): Account {
  const record = readObject(value, ['id', 'userId', 'name', 'kind', 'availability']);
  return {
    ...readCommon(record),
    name: readString(record, 'name'),
    kind: readEnum(record, 'kind', ['checking', 'savings', 'cash', 'digital', 'transport', 'investment', 'other']),
    availability: readEnum(record, 'availability', ['free', 'reserved', 'restricted']),
  };
}

function readCategory(value: unknown): Category {
  const record = readObject(value, ['id', 'userId', 'name', 'kind', 'parentId']);
  return {
    ...readCommon(record),
    name: readString(record, 'name'),
    kind: readEnum(record, 'kind', ['income', 'expense', 'both']),
    ...readOptionalString(record, 'parentId'),
  };
}

function readEvent(value: unknown): FinancialEvent {
  const record = readObject(value, [
    'id', 'userId', 'kind', 'status', 'source', 'amountCents', 'accountId', 'transferAccountId',
    'categoryId', 'description', 'competenceDate', 'dueDate', 'certainty', 'adjustmentDirection',
    'reversesEventId', 'replacesEventId',
  ]);
  const optionalDirection = Object.hasOwn(record, 'adjustmentDirection')
    ? { adjustmentDirection: readEnum(record, 'adjustmentDirection', ['increase', 'decrease']) }
    : {};
  return {
    ...readCommon(record),
    kind: readEnum(record, 'kind', ['income', 'expense', 'transfer', 'adjustment']),
    status: readEnum(record, 'status', ['planned', 'confirmed', 'cancelled']),
    source: readEnum(record, 'source', ['manual', 'import', 'opening_balance']),
    amountCents: decodeCents(record.amountCents),
    accountId: readString(record, 'accountId'),
    description: readString(record, 'description'),
    competenceDate: readString(record, 'competenceDate'),
    certainty: readEnum(record, 'certainty', ['confirmed', 'estimated']),
    ...readOptionalString(record, 'transferAccountId'),
    ...readOptionalString(record, 'categoryId'),
    ...readOptionalString(record, 'dueDate'),
    ...readOptionalString(record, 'reversesEventId'),
    ...readOptionalString(record, 'replacesEventId'),
    ...optionalDirection,
  };
}

function readSettlement(value: unknown): Settlement {
  const record = readObject(value, ['id', 'userId', 'eventId', 'amountCents', 'paymentDate', 'settlementDate']);
  return {
    ...readCommon(record),
    eventId: readString(record, 'eventId'),
    amountCents: decodeCents(record.amountCents),
    paymentDate: readString(record, 'paymentDate'),
    settlementDate: readString(record, 'settlementDate'),
  };
}

function readPosting(value: unknown): Posting {
  const record = readObject(value, ['id', 'userId', 'settlementId', 'accountId', 'amountCents']);
  return {
    ...readCommon(record),
    settlementId: readString(record, 'settlementId'),
    accountId: readString(record, 'accountId'),
    amountCents: decodeCents(record.amountCents),
  };
}
