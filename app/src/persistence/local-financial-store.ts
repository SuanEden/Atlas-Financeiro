import Dexie, { type EntityTable } from 'dexie';
import {
  assertEntityId,
  assertFinancialDataset,
  type Account,
  type Category,
  type FinancialDataset,
  type FinancialEvent,
  type LocalFinancialState,
  type PendingOperation,
  type Posting,
  type Settlement,
} from '../domain';

const DATA_TABLE_NAMES = ['accounts', 'categories', 'events', 'settlements', 'postings'] as const;
const ALL_TABLE_NAMES = [...DATA_TABLE_NAMES, 'outbox'] as const;

/** A local domain aggregate to append. This is not a synchronization operation. */
export type FinancialAggregate = Partial<FinancialDataset>;

class FinancialDatabase extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  events!: EntityTable<FinancialEvent, 'id'>;
  settlements!: EntityTable<Settlement, 'id'>;
  postings!: EntityTable<Posting, 'id'>;
  outbox!: EntityTable<PendingOperation, 'id'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      accounts: 'id, userId',
      categories: 'id, userId, parentId',
      events: 'id, userId, accountId, competenceDate',
      settlements: 'id, userId, eventId, settlementDate',
      postings: 'id, userId, settlementId, accountId',
    });
    this.version(2).stores({
      accounts: 'id, userId',
      categories: 'id, userId, parentId',
      events: 'id, userId, accountId, competenceDate, reversesEventId, replacesEventId',
      settlements: 'id, userId, eventId, settlementDate',
      postings: 'id, userId, settlementId, accountId',
      outbox: 'id, userId, createdAt, kind',
    });
  }
}

/**
 * Isolates local datasets by user ID and validates every aggregate as a whole.
 * This is a persistence boundary, not authentication or protection from someone
 * with access to this browser profile or its developer tools.
 */
export class LocalFinancialStore {
  readonly userId: string;
  readonly databaseName: string;
  readonly #db: FinancialDatabase;

  constructor(userId: string) {
    assertEntityId(userId, 'Usuário local');
    this.userId = userId;
    this.databaseName = `atlas-financeiro:user:${encodeURIComponent(userId)}`;
    this.#db = new FinancialDatabase(this.databaseName);
  }

  /** Inserts only; existing records cannot be silently overwritten. */
  async appendAggregate(aggregate: FinancialAggregate): Promise<void> {
    const input = copyAggregate(aggregate);
    await this.#db.transaction('rw', DATA_TABLE_NAMES, async () => {
      const current = await this.#readTables();
      const next = mergeDataset(current, input);
      assertFinancialDataset(next, this.userId);
      await this.#insertAggregate(input);
    });
  }

  /** Persists a validated financial command and its outbox record atomically. */
  async commitOperation(aggregate: FinancialAggregate, operation: PendingOperation): Promise<void> {
    const input = copyAggregate(aggregate);
    const pending = structuredClone(operation);
    assertPendingOperation(pending, this.userId);
    await this.#db.transaction('rw', ALL_TABLE_NAMES, async () => {
      const current = await this.#readTables();
      assertFinancialDataset(mergeDataset(current, input), this.userId);
      await this.#insertAggregate(input);
      await this.#db.outbox.add(pending);
    });
  }

  async readSnapshot(): Promise<FinancialDataset> {
    return this.#db.transaction('r', DATA_TABLE_NAMES, async () => {
      const dataset = await this.#readTables();
      assertFinancialDataset(dataset, this.userId);
      return dataset;
    });
  }

  async readLocalState(): Promise<LocalFinancialState> {
    return this.#db.transaction('r', ALL_TABLE_NAMES, async () => {
      const dataset = await this.#readTables();
      assertFinancialDataset(dataset, this.userId);
      const outbox = await this.#db.outbox.orderBy('createdAt').toArray();
      for (const operation of outbox) assertPendingOperation(operation, this.userId);
      return { ...dataset, outbox };
    });
  }

  close(): void {
    this.#db.close();
  }

  async #readTables(): Promise<FinancialDataset> {
    const [accounts, categories, events, settlements, postings] = await Promise.all([
      this.#db.accounts.toArray(),
      this.#db.categories.toArray(),
      this.#db.events.toArray(),
      this.#db.settlements.toArray(),
      this.#db.postings.toArray(),
    ]);
    return { accounts, categories, events, settlements, postings };
  }

  async #insertAggregate(input: FinancialDataset): Promise<void> {
    // Do not catch individual bulk failures: any failure aborts every table and the outbox write.
    await this.#db.accounts.bulkAdd(input.accounts);
    await this.#db.categories.bulkAdd(input.categories);
    await this.#db.events.bulkAdd(input.events);
    await this.#db.settlements.bulkAdd(input.settlements);
    await this.#db.postings.bulkAdd(input.postings);
  }
}

function copyAggregate(aggregate: FinancialAggregate): FinancialDataset {
  if (typeof aggregate !== 'object' || aggregate === null || Array.isArray(aggregate)) {
    throw new TypeError('O agregado financeiro deve ser um objeto.');
  }
  const allowedKeys: ReadonlySet<string> = new Set(DATA_TABLE_NAMES);
  for (const key of Object.keys(aggregate)) {
    if (!allowedKeys.has(key)) throw new TypeError(`Tabela local desconhecida: ${key}.`);
  }
  for (const name of DATA_TABLE_NAMES) {
    if (name in aggregate && !Array.isArray(aggregate[name])) {
      throw new TypeError(`A coleção ${name} deve ser um array.`);
    }
  }
  // IndexedDB uses structured clone too: bigint remains bigint, never a number.
  return structuredClone({
    accounts: aggregate.accounts ?? [],
    categories: aggregate.categories ?? [],
    events: aggregate.events ?? [],
    settlements: aggregate.settlements ?? [],
    postings: aggregate.postings ?? [],
  });
}

function mergeDataset(current: FinancialDataset, input: FinancialDataset): FinancialDataset {
  return {
    accounts: [...current.accounts, ...input.accounts],
    categories: [...current.categories, ...input.categories],
    events: [...current.events, ...input.events],
    settlements: [...current.settlements, ...input.settlements],
    postings: [...current.postings, ...input.postings],
  };
}

function assertPendingOperation(operation: PendingOperation, userId: string): void {
  assertEntityId(operation.id, 'Operação pendente');
  assertEntityId(operation.userId, 'Proprietário da operação');
  if (operation.userId !== userId) throw new TypeError('A operação pendente pertence a outro usuário.');
  const kinds = ['create_account', 'create_category', 'record_event', 'reverse_event', 'replace_event'];
  if (!kinds.includes(operation.kind)) throw new TypeError('Tipo de operação pendente inválido.');
  if (typeof operation.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(operation.createdAt)) {
    throw new TypeError('Instante da operação pendente inválido.');
  }
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

export function createLocalFinancialStore(userId: string): LocalFinancialStore {
  return new LocalFinancialStore(userId);
}
