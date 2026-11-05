import Dexie, { type EntityTable } from 'dexie';
import {
  assertEntityId,
  assertFinancialDataset,
  type Account,
  type AccountReconciliation,
  type Category,
  type FinancialDataset,
  type FinancialEvent,
  type LocalFinancialState,
  type PendingOperation,
  type Posting,
  type Settlement,
} from '../domain';
import { serializeOperationPayload } from '../serialization';
import { assertPendingOperation } from '../serialization/pending-operation';
import { canonicalLocalState, validateI2Backup } from '../backup/validate-i2-backup';
export { assertPendingOperation } from '../serialization/pending-operation';

const DATA_TABLE_NAMES = ['accounts', 'categories', 'events', 'settlements', 'postings', 'accountReconciliations'] as const;
const ALL_TABLE_NAMES = [...DATA_TABLE_NAMES, 'outbox'] as const;

/** A local domain aggregate to append. This is not a synchronization operation. */
export type FinancialAggregate = Partial<FinancialDataset>;

class FinancialDatabase extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  events!: EntityTable<FinancialEvent, 'id'>;
  settlements!: EntityTable<Settlement, 'id'>;
  postings!: EntityTable<Posting, 'id'>;
  accountReconciliations!: EntityTable<AccountReconciliation, 'id'>;
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
    this.version(3).stores({
      accounts: 'id, userId',
      categories: 'id, userId, parentId',
      events: 'id, userId, accountId, competenceDate, reversesEventId, replacesEventId',
      settlements: 'id, userId, eventId, settlementDate',
      postings: 'id, userId, settlementId, accountId',
      accountReconciliations: 'id, userId, accountId, referenceDate, replacesReconciliationId',
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
    if (pending.payloadJson !== serializeOperationPayload(aggregate, this.userId)) {
      throw new TypeError('A operação pendente não corresponde ao agregado financeiro.');
    }
    await this.#db.transaction('rw', ALL_TABLE_NAMES, async () => {
      const current = await this.#readTables();
      assertFinancialDataset(mergeDataset(current, input), this.userId);
      await this.#insertAggregate(input);
      await this.#db.outbox.add(pending);
    });
  }

  /** Edits local account/category metadata atomically, retaining IDs and every financial record.
   * Only an unsent create operation can be rewritten; remote edits require a future protocol version. */
  async editEntityMetadata(entity: 'account' | 'category', id: string, changes: {
    name: string;
    kind: Account['kind'] | Category['kind'];
    availability?: Account['availability'];
    parentId?: string;
  }): Promise<void> {
    const name = changes.name.trim();
    if (!name || name.length > 120) throw new TypeError('Informe um nome de até 120 caracteres.');
    await this.#db.transaction('rw', ALL_TABLE_NAMES, async () => {
      const current = await this.#readTables();
      const collection = entity === 'account' ? current.accounts : current.categories;
      const previous = collection.find(row => row.id === id);
      if (!previous) throw new TypeError('Registro não encontrado.');
      const next: FinancialDataset = structuredClone(current);
      if (entity === 'account') {
        const account = next.accounts.find(row => row.id === id)!;
        account.name = name;
        account.kind = changes.kind as Account['kind'];
        account.availability = account.kind === 'transport' ? 'restricted' : (changes.availability ?? account.availability);
      } else {
        const category = next.categories.find(row => row.id === id)!;
        category.name = name;
        category.kind = changes.kind as Category['kind'];
        if (changes.parentId) category.parentId = changes.parentId;
        else delete category.parentId;
      }
      assertFinancialDataset(next, this.userId);
      const pending = await this.#db.outbox.where('kind').equals(entity === 'account' ? 'create_account' : 'create_category').toArray();
      const operation = pending.find(row => {
        const payload = JSON.parse(row.payloadJson) as Record<string, unknown>;
        const records = payload[entity === 'account' ? 'accounts' : 'categories'];
        return Array.isArray(records) && records.some(record => record && typeof record === 'object' && (record as {id?:string}).id === id);
      });
      if (!operation) throw new TypeError('Este registro não possui criação local pendente. Para evitar divergências na sincronização, a edição ainda não está disponível.');
      const payload = JSON.parse(operation.payloadJson) as Record<string, unknown>;
      const key = entity === 'account' ? 'accounts' : 'categories';
      const records = payload[key] as {id:string}[];
      const updated = entity === 'account' ? next.accounts.find(row => row.id === id)! : next.categories.find(row => row.id === id)!;
      payload[key] = records.map(row => row.id === id ? structuredClone(updated) : row);
      const revisedOperation = {...operation,payloadJson:JSON.stringify(payload)};
      assertPendingOperation(revisedOperation,this.userId);
      if (entity === 'account') await this.#db.accounts.put(next.accounts.find(row => row.id === id)!);
      else await this.#db.categories.put(next.categories.find(row => row.id === id)!);
      await this.#db.outbox.put(revisedOperation);
    });
  }

  /** Deletes only unused metadata and its unsent create command, within one rollback-safe transaction. */
  async deleteUnusedEntity(entity:'account'|'category',id:string):Promise<void> {
    await this.#db.transaction('rw',ALL_TABLE_NAMES,async()=>{
      const current=await this.#readTables();
      const rows=entity==='account'?current.accounts:current.categories;
      if (!rows.some(row=>row.id===id)) throw new TypeError('Registro não encontrado.');
      if (entity==='account' && (
        current.events.some(row=>row.accountId===id||row.transferAccountId===id) ||
        current.postings.some(row=>row.accountId===id) ||
        (current.accountReconciliations??[]).some(row=>row.accountId===id)
      )) throw new TypeError('Esta conta possui lançamentos ou conciliações e não pode ser excluída. O histórico deve ser preservado.');
      if (entity==='category' && (
        current.events.some(row=>row.categoryId===id) ||
        current.categories.some(row=>row.parentId===id)
      )) throw new TypeError('Esta categoria está sendo utilizada por lançamentos ou subcategorias e não pode ser excluída.');
      const pending=await this.#db.outbox.where('kind').equals(entity==='account'?'create_account':'create_category').toArray();
      const key=entity==='account'?'accounts':'categories';
      const operation=pending.find(row=>{
        const payload=JSON.parse(row.payloadJson) as Record<string,unknown>;
        return Array.isArray(payload[key]) && (payload[key] as {id:string}[]).some(item=>item.id===id);
      });
      if(!operation)throw new TypeError('Registro sem operação local de criação. A exclusão foi bloqueada para proteger a sincronização.');
      const payload=JSON.parse(operation.payloadJson) as Record<string,unknown>;
      if(!Array.isArray(payload[key]) || payload[key].length!==1 ||
        Object.entries(payload).some(([k,v])=>k!=='schemaVersion'&&k!=='userId'&&k!==key&&Array.isArray(v)&&v.length>0))
        throw new TypeError('Esta criação contém outros dados vinculados; não pode ser excluída com segurança.');
      const next:FinancialDataset=entity==='account'
        ? {...current,accounts:current.accounts.filter(row=>row.id!==id)}
        : {...current,categories:current.categories.filter(row=>row.id!==id)};
      assertFinancialDataset(next,this.userId);
      if(entity==='account')await this.#db.accounts.delete(id);
      else await this.#db.categories.delete(id);
      await this.#db.outbox.delete(operation.id);
    });
  }

  async readSnapshot(): Promise<FinancialDataset> {
    return this.#db.transaction('r', DATA_TABLE_NAMES, async () => {
      const dataset = await this.#readTables();
      assertFinancialDataset(dataset, this.userId);
      return dataset;
    });
  }

  /** Minimal recovery: only an empty namespace or an exact existing copy, never replace/merge. */
  async recoverI2Backup(json: string): Promise<'recovered' | 'already_present'> {
    const backup = validateI2Backup(json);
    if (backup.userId !== this.userId) throw new TypeError('A recuperação deve preservar o proprietário original.');
    return this.#db.transaction('rw', ALL_TABLE_NAMES, async () => {
      const current: LocalFinancialState = { ...await this.#readTables(), outbox: await this.#db.outbox.toArray() };
      if (ALL_TABLE_NAMES.some((table) => (current[table]?.length ?? 0) > 0)) {
        if (canonicalLocalState(current, this.userId) === canonicalLocalState(backup.state, this.userId)) return 'already_present';
        throw new TypeError('O destino contém dados diferentes. A recuperação não une nem substitui bases.');
      }
      await this.#insertAggregate(backup.state);
      await this.#db.outbox.bulkAdd(backup.state.outbox);
      return 'recovered';
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
    const [accounts, categories, events, settlements, postings, accountReconciliations] = await Promise.all([
      this.#db.accounts.toArray(),
      this.#db.categories.toArray(),
      this.#db.events.toArray(),
      this.#db.settlements.toArray(),
      this.#db.postings.toArray(),
      this.#db.accountReconciliations.toArray(),
    ]);
    return { accounts, categories, events, settlements, postings, ...(accountReconciliations.length === 0 ? {} : { accountReconciliations }) };
  }

  async #insertAggregate(input: FinancialDataset): Promise<void> {
    // Do not catch individual bulk failures: any failure aborts every table and the outbox write.
    await this.#db.accounts.bulkAdd(input.accounts);
    await this.#db.categories.bulkAdd(input.categories);
    await this.#db.events.bulkAdd(input.events);
    await this.#db.settlements.bulkAdd(input.settlements);
    await this.#db.postings.bulkAdd(input.postings);
    await this.#db.accountReconciliations.bulkAdd(input.accountReconciliations ?? []);
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
    accountReconciliations: aggregate.accountReconciliations ?? [],
  });
}

function mergeDataset(current: FinancialDataset, input: FinancialDataset): FinancialDataset {
  return {
    accounts: [...current.accounts, ...input.accounts],
    categories: [...current.categories, ...input.categories],
    events: [...current.events, ...input.events],
    settlements: [...current.settlements, ...input.settlements],
    postings: [...current.postings, ...input.postings],
    accountReconciliations: [...(current.accountReconciliations ?? []), ...(input.accountReconciliations ?? [])],
  };
}

export function createLocalFinancialStore(userId: string): LocalFinancialStore {
  return new LocalFinancialStore(userId);
}
