import Dexie, { type EntityTable } from 'dexie';
import {
  assertEntityId,
  assertFinancialDataset,
  type Account,
  type Category,
  type FinancialDataset,
  type FinancialEvent,
  type Posting,
  type Settlement,
} from '../domain';

const TABLE_NAMES = ['accounts', 'categories', 'events', 'settlements', 'postings'] as const;

/** A local domain aggregate to append. This is not a synchronization operation. */
export type FinancialAggregate = Partial<FinancialDataset>;

class FinancialDatabase extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  events!: EntityTable<FinancialEvent, 'id'>;
  settlements!: EntityTable<Settlement, 'id'>;
  postings!: EntityTable<Posting, 'id'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      accounts: 'id, userId',
      categories: 'id, userId, parentId',
      events: 'id, userId, accountId, competenceDate',
      settlements: 'id, userId, eventId, settlementDate',
      postings: 'id, userId, settlementId, accountId',
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
    await this.#db.transaction('rw', TABLE_NAMES, async () => {
      const current = await this.#readTables();
      const next: FinancialDataset = {
        accounts: [...current.accounts, ...input.accounts],
        categories: [...current.categories, ...input.categories],
        events: [...current.events, ...input.events],
        settlements: [...current.settlements, ...input.settlements],
        postings: [...current.postings, ...input.postings],
      };
      assertFinancialDataset(next, this.userId);

      // Do not catch individual bulk failures: any failure must abort every table.
      await this.#db.accounts.bulkAdd(input.accounts);
      await this.#db.categories.bulkAdd(input.categories);
      await this.#db.events.bulkAdd(input.events);
      await this.#db.settlements.bulkAdd(input.settlements);
      await this.#db.postings.bulkAdd(input.postings);
    });
  }

  async readSnapshot(): Promise<FinancialDataset> {
    return this.#db.transaction('r', TABLE_NAMES, async () => {
      const dataset = await this.#readTables();
      assertFinancialDataset(dataset, this.userId);
      return dataset;
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
}

function copyAggregate(aggregate: FinancialAggregate): FinancialDataset {
  if (typeof aggregate !== 'object' || aggregate === null || Array.isArray(aggregate)) {
    throw new TypeError('O agregado financeiro deve ser um objeto.');
  }
  const allowedKeys: ReadonlySet<string> = new Set(TABLE_NAMES);
  for (const key of Object.keys(aggregate)) {
    if (!allowedKeys.has(key)) throw new TypeError(`Tabela local desconhecida: ${key}.`);
  }
  for (const name of TABLE_NAMES) {
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

export function createLocalFinancialStore(userId: string): LocalFinancialStore {
  return new LocalFinancialStore(userId);
}
