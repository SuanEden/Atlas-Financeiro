// Synthetic fixtures for real-browser verification. This module is not imported
// by the application and is not part of the production bundle.
import { MAX_ENTRY_CENTS, calculateAccountBalance, type FinancialDataset } from '../src/domain';
import { createLocalFinancialStore } from '../src/persistence/local-financial-store';
import { deserializeFinancialDataset, serializeFinancialDataset } from '../src/serialization/financial-json';

const userId = '10000000-0000-4000-8000-000000000001';
const id = (value: number) => `20000000-0000-4000-8000-${String(value).padStart(12, '0')}`;

function syntheticTransfer(): FinancialDataset {
  return {
    accounts: [
      { id: id(1), userId, name: 'Origem sintética', kind: 'cash', availability: 'free' },
      { id: id(2), userId, name: 'Destino sintético', kind: 'savings', availability: 'reserved' },
    ],
    categories: [],
    events: [{
      id: id(3), userId, kind: 'transfer', status: 'confirmed', certainty: 'confirmed', source: 'manual',
      amountCents: MAX_ENTRY_CENTS, accountId: id(1), transferAccountId: id(2),
      description: 'Transferência sintética de teste', competenceDate: '2026-01-31',
    }],
    settlements: [{
      id: id(4), userId, eventId: id(3), amountCents: MAX_ENTRY_CENTS,
      paymentDate: '2026-02-01', settlementDate: '2026-02-02',
    }],
    postings: [
      { id: id(5), userId, settlementId: id(4), accountId: id(1), amountCents: -MAX_ENTRY_CENTS },
      { id: id(6), userId, settlementId: id(4), accountId: id(2), amountCents: MAX_ENTRY_CENTS },
    ],
  };
}

export async function writeSyntheticTransfer(): Promise<string> {
  const store = createLocalFinancialStore(userId);
  try {
    await store.appendAggregate(syntheticTransfer());
    return store.databaseName;
  } finally {
    store.close();
  }
}

export async function inspectReopenedTransfer() {
  const store = createLocalFinancialStore(userId);
  try {
    const data = await store.readSnapshot();
    const json = serializeFinancialDataset(data, userId);
    const restored = deserializeFinancialDataset(json, userId);
    return {
      eventType: typeof data.events[0]?.amountCents,
      amount: data.events[0]?.amountCents.toString(),
      outgoing: data.postings.find((posting) => posting.accountId === id(1))?.amountCents.toString(),
      incoming: data.postings.find((posting) => posting.accountId === id(2))?.amountCents.toString(),
      sum: data.postings.reduce((total, posting) => total + posting.amountCents, 0n).toString(),
      balance: calculateAccountBalance(data, id(1)).toString(),
      jsonUsesStrings: typeof (JSON.parse(json) as { events: { amountCents: unknown }[] }).events[0]?.amountCents === 'string',
      restoredType: typeof restored.events[0]?.amountCents,
      restoredAmount: restored.events[0]?.amountCents.toString(),
      beforeLiquidation: calculateAccountBalance(data, id(1), '2026-02-01').toString(),
    };
  } finally {
    store.close();
  }
}

export async function proveNativeRollback() {
  const rollbackOwner = '10000000-0000-4000-8000-000000000002';
  const baseline: FinancialDataset = {
    accounts: [{ id: id(99), userId: rollbackOwner, name: 'Anterior sintética', kind: 'cash', availability: 'free' }],
    categories: [], events: [], settlements: [], postings: [],
  };
  const store = createLocalFinancialStore(rollbackOwner);
  await store.appendAggregate(baseline);
  const transfer = syntheticTransfer();
  for (const rows of [transfer.accounts, transfer.categories, transfer.events, transfer.settlements, transfer.postings]) {
    for (const row of rows) row.userId = rollbackOwner;
  }
  const nativeAdd = IDBObjectStore.prototype.add;
  let earlierWrites = 0;
  let injectedFailure = false;
  IDBObjectStore.prototype.add = function (this: IDBObjectStore, value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
    if (this.name === 'postings') {
      injectedFailure = true;
      throw new DOMException('Falha sintética na última coleção.', 'DataCloneError');
    }
    earlierWrites += 1;
    return key === undefined ? nativeAdd.call(this, value) : nativeAdd.call(this, value, key);
  };
  let rejected = false;
  try {
    await store.appendAggregate(transfer);
  } catch {
    rejected = true;
  } finally {
    IDBObjectStore.prototype.add = nativeAdd;
    store.close();
  }
  const reopened = createLocalFinancialStore(rollbackOwner);
  try {
    const after = await reopened.readSnapshot();
    return {
      rejected, injectedFailure, earlierWrites,
      baselinePreserved: JSON.stringify(after) === JSON.stringify(baseline),
      counts: [after.accounts.length, after.events.length, after.settlements.length, after.postings.length],
    };
  } finally {
    reopened.close();
  }
}
