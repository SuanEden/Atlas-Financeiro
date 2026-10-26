import 'fake-indexeddb/auto';
import { IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccountCommand, type CommandContext } from '../application';
import type { FinancialDataset } from '../domain';
import { createLocalFinancialStore, LocalFinancialStore } from './local-financial-store';
import { syntheticDataset } from './synthetic-fixture.test-helper';

let userSequence = 0;
const stores: LocalFinancialStore[] = [];

function openStore(userId = `10000000-0000-4000-8000-${String(++userSequence).padStart(12, '0')}`): LocalFinancialStore {
  const store = createLocalFinancialStore(userId);
  stores.push(store);
  return store;
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const store of stores.splice(0)) store.close();
});

describe('local financial persistence', () => {
  it('requires a canonical user identifier before opening a namespace', () => {
    expect(() => createLocalFinancialStore('not-a-user-id')).toThrow();
    expect(() => createLocalFinancialStore('10000000-0000-4000-8000-00000000000A')).toThrow();
  });

  it('reopens the five collections without converting bigint to floating point', async () => {
    const first = openStore();
    const dataset = syntheticDataset(first.userId);
    await first.appendAggregate(dataset);
    first.close();

    const reopened = openStore(first.userId);
    const saved = await reopened.readSnapshot();
    expect(saved).toEqual(dataset);
    expect(typeof saved.events[0]!.amountCents).toBe('bigint');
    expect(saved.postings.reduce((sum, posting) => sum + posting.amountCents, 0n)).toBe(0n);
  });

  it('rolls back all inserted tables when the last table fails, preserving previous data', async () => {
    const store = openStore();
    const baseline: FinancialDataset = {
      accounts: [{ id: '00000000-0000-4000-8000-000000000099', userId: store.userId, name: 'Anterior', kind: 'cash', availability: 'free' }],
      categories: [], events: [], settlements: [], postings: [],
    };
    await store.appendAggregate(baseline);
    const originalAdd = FakeObjectStore.prototype.add;
    const failure = vi.spyOn(FakeObjectStore.prototype, 'add').mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'postings') throw new DOMException('Falha sintética na última coleção.', 'DataCloneError');
      return originalAdd.call(this, value, key);
    });

    await expect(store.appendAggregate(syntheticDataset(store.userId))).rejects.toThrow();
    failure.mockRestore();
    expect(await store.readSnapshot()).toEqual(baseline);
    store.close();
    expect(await openStore(store.userId).readSnapshot()).toEqual(baseline);
  });

  it('rejects incomplete transfers and missing references without saving any part', async () => {
    const store = openStore();
    const incomplete = syntheticDataset(store.userId);
    incomplete.postings.pop();
    await expect(store.appendAggregate(incomplete)).rejects.toThrow();

    const missingAccount = syntheticDataset(store.userId);
    missingAccount.events[0]!.accountId = '00000000-0000-4000-8000-000000000099';
    await expect(store.appendAggregate(missingAccount)).rejects.toThrow();
    expect(await store.readSnapshot()).toEqual({ accounts: [], categories: [], events: [], settlements: [], postings: [] });
  });

  it('rejects duplicate identifiers instead of silently overwriting records', async () => {
    const store = openStore();
    const dataset = syntheticDataset(store.userId);
    await store.appendAggregate(dataset);
    await expect(store.appendAggregate({ accounts: [{ ...dataset.accounts[0]!, name: 'Alteração rejeitada' }] })).rejects.toThrow();
    expect(await store.readSnapshot()).toEqual(dataset);
  });

  it('keeps equal record IDs in separate user namespaces and rejects mixed ownership', async () => {
    const first = openStore();
    const second = openStore();
    const firstData = syntheticDataset(first.userId);
    await first.appendAggregate(firstData);
    expect((await second.readSnapshot()).accounts).toHaveLength(0);
    await expect(second.appendAggregate(firstData)).rejects.toThrow();

    const secondData = syntheticDataset(second.userId);
    secondData.accounts[0]!.name = 'Outra carteira sintética';
    await second.appendAggregate(secondData);
    expect(await first.readSnapshot()).toEqual(firstData);
    expect(await second.readSnapshot()).toEqual(secondData);
  });

  it('rejects ownership violations even when they are nested in the last collection', async () => {
    const store = openStore();
    const dataset = syntheticDataset(store.userId);
    dataset.postings[1]!.userId = '90000000-0000-4000-8000-000000000001';
    await expect(store.appendAggregate(dataset)).rejects.toThrow();
    expect((await store.readSnapshot()).accounts).toHaveLength(0);
  });

  it('can append settlements and postings together against previously persisted events', async () => {
    const store = openStore();
    const dataset = syntheticDataset(store.userId);
    await store.appendAggregate({ accounts: dataset.accounts, categories: dataset.categories, events: dataset.events });
    await store.appendAggregate({ settlements: dataset.settlements, postings: dataset.postings });
    expect(await store.readSnapshot()).toEqual(dataset);
  });

  it('commits financial rows and the pending operation in the same transaction', async () => {
    const store = openStore();
    let sequence = 500;
    const context: CommandContext = {
      userId: store.userId,
      nextId: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
      now: () => '2026-10-26T12:00:00.000Z',
      today: () => '2026-10-26',
    };
    const command = createAccountCommand({ name: 'Conta com outbox', kind: 'cash', availability: 'free', openingDate: '2026-10-26' }, context);
    await store.commitOperation(command.aggregate, command.operation);
    const state = await store.readLocalState();
    expect(state.accounts).toHaveLength(1);
    expect(state.outbox).toEqual([command.operation]);
    store.close();
    expect(await openStore(store.userId).readLocalState()).toEqual(state);
    const replay = openStore(store.userId);
    await expect(replay.commitOperation(command.aggregate, command.operation)).rejects.toThrow();
    expect(await replay.readLocalState()).toEqual(state);
  });

  it('rejects an outbox payload describing different financial rows before writing', async () => {
    const store = openStore();
    const context: CommandContext = {
      userId: store.userId, nextId: () => crypto.randomUUID(),
      now: () => '2026-10-26T12:00:00.000Z', today: () => '2026-10-26',
    };
    const command = createAccountCommand({ name: 'Conta sintética', kind: 'cash', availability: 'free', openingDate: context.today() }, context);
    const changed = structuredClone(command.aggregate);
    changed.accounts![0]!.name = 'Conteúdo divergente';
    await expect(store.commitOperation(changed, command.operation)).rejects.toThrow(/não corresponde/);
    expect((await store.readLocalState()).accounts).toEqual([]);
    expect((await store.readLocalState()).outbox).toEqual([]);
  });

  it('rolls back financial rows when the outbox write fails', async () => {
    const store = openStore();
    let sequence = 700;
    const context: CommandContext = {
      userId: store.userId,
      nextId: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
      now: () => '2026-10-26T12:00:00.000Z',
      today: () => '2026-10-26',
    };
    const command = createAccountCommand({ name: 'Conta revertida', kind: 'cash', availability: 'free', openingDate: '2026-10-26' }, context);
    const originalAdd = FakeObjectStore.prototype.add;
    const failure = vi.spyOn(FakeObjectStore.prototype, 'add').mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'outbox') throw new DOMException('Falha sintética na outbox.', 'DataCloneError');
      return originalAdd.call(this, value, key);
    });
    await expect(store.commitOperation(command.aggregate, command.operation)).rejects.toThrow();
    failure.mockRestore();
    const state = await store.readLocalState();
    expect(state.accounts).toHaveLength(0);
    expect(state.outbox).toHaveLength(0);
  });
});
