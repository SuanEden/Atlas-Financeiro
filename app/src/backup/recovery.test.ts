import 'fake-indexeddb/auto';
import { IDBObjectStore as FakeObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { serializeLocalBackup } from './local-backup';
import { validateI2Backup, canonicalLocalState } from './validate-i2-backup';
import { createLocalFinancialStore, type LocalFinancialStore } from '../persistence';
import { calculateAvailabilityBalances, calculateCashTotals, calculateAccrualTotals } from '../domain';
import { recoveryFixture } from '../../tests/recovery-fixture';
import { recoverIntoEmptyOrigin } from '../application/recover-local-backup';
import { LOCAL_OWNER_KEY } from '../application/local-identity';

const stores: LocalFinancialStore[] = [];
function open(userId: string) { const db = createLocalFinancialStore(userId); stores.push(db); return db; }
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); stores.splice(0).forEach((db) => db.close()); });

describe('recuperação mínima de I2', () => {
  it('exporta e recupera IDs, valores, histórico e pendências exatos em destino limpo; repetir não duplica', async () => {
    const state = recoveryFixture();
    const json = serializeLocalBackup(state, state.accounts[0]!.userId);
    const backup = validateI2Backup(json);
    expect(canonicalLocalState(backup.state, backup.userId)).toBe(canonicalLocalState(state, backup.userId));
    const db = open(backup.userId);
    expect(await db.recoverI2Backup(json)).toBe('recovered');
    expect(await db.recoverI2Backup(json)).toBe('already_present');
    db.close();
    const recovered = await open(backup.userId).readLocalState();
    expect(canonicalLocalState(recovered, backup.userId)).toBe(canonicalLocalState(state, backup.userId));
    expect(recovered.outbox.map((row) => row.id).sort()).toEqual(state.outbox.map((row) => row.id).sort());
    expect(calculateAvailabilityBalances(recovered)).toEqual(calculateAvailabilityBalances(state));
    const period = { start: '2026-10-01', end: '2026-10-31' };
    expect(calculateCashTotals(recovered, period)).toEqual(calculateCashTotals(state, period));
    expect(calculateAccrualTotals(recovered, period)).toEqual(calculateAccrualTotals(state, period));
  });

  it.each(['version', 'count', 'owner', 'money', 'reference', 'duplicate', 'payload', 'operation-kind', 'partial-transfer', 'unknown'])('recusa arquivo inválido (%s) sem gravar parcialmente', async (fault) => {
    const state = recoveryFixture(); const owner = state.accounts[0]!.userId;
    const raw = JSON.parse(serializeLocalBackup(state, owner));
    if (fault === 'version') raw.schemaVersion = 3;
    if (fault === 'count') raw.manifest.accounts++;
    if (fault === 'owner') raw.data.accounts[0].userId = crypto.randomUUID();
    if (fault === 'money') raw.data.events[0].amountCents = 100003;
    if (fault === 'reference') raw.data.events[0].accountId = crypto.randomUUID();
    if (fault === 'duplicate') { raw.outbox.push(raw.outbox[0]); raw.manifest.pendingOperations++; }
    if (fault === 'payload') raw.outbox[0].payload.accounts[0].name = 'Divergência sintética';
    if (fault === 'operation-kind') raw.outbox[0].kind = 'reverse_event';
    if (fault === 'partial-transfer') raw.outbox.find((row: { payload: { postings?: unknown[] } }) => row.payload.postings?.length === 2).payload.postings.pop();
    if (fault === 'unknown') raw.token = 'não é uma sessão';
    const db = open(owner);
    await expect(db.recoverI2Backup(JSON.stringify(raw))).rejects.toThrow();
    expect(Object.values(await db.readLocalState()).every((rows) => rows.length === 0)).toBe(true);
  });

  it('aborta todas as tabelas se falhar a última escrita da outbox', async () => {
    const state = recoveryFixture(); const owner = state.accounts[0]!.userId; const db = open(owner);
    const originalAdd = FakeObjectStore.prototype.add;
    const failure = vi.spyOn(FakeObjectStore.prototype, 'add').mockImplementation(function(this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (this.name === 'outbox') throw new DOMException('Falha sintética final.', 'DataCloneError');
      return originalAdd.call(this, value, key);
    });
    await expect(db.recoverI2Backup(serializeLocalBackup(state, owner))).rejects.toThrow();
    failure.mockRestore();
    expect(Object.values(await db.readLocalState()).every((rows) => rows.length === 0)).toBe(true);
  });

  it('não substitui destino ocupado e exige o proprietário original', async () => {
    const state = recoveryFixture(); const owner = state.accounts[0]!.userId; const db = open(owner);
    const json = serializeLocalBackup(state, owner);
    await db.recoverI2Backup(json);
    const changed = structuredClone(state); changed.events[0]!.description = 'Mudança não aplicada';
    await expect(db.recoverI2Backup(serializeLocalBackup(changed, owner))).rejects.toThrow();
    expect(canonicalLocalState(await db.readLocalState(), owner)).toBe(canonicalLocalState(state, owner));
    await expect(open(crypto.randomUUID()).recoverI2Backup(json)).rejects.toThrow(/proprietário/);
  });

  it('mantém ponteiro original se ativação falhar; retomar reconhece a cópia completa', async () => {
    vi.stubGlobal('navigator', undefined); // Unit simulation; real Web Locks are covered by browser tests.
    const current = crypto.randomUUID(); const state = recoveryFixture(); const owner = state.accounts[0]!.userId;
    let active: string = current; let fail = true;
    const storage = { getItem: () => active, setItem: (key: string, value: string) => { expect(key).toBe(LOCAL_OWNER_KEY); if (fail) throw new Error('Falha sintética de ativação'); active = value; } };
    const json = serializeLocalBackup(state, owner);
    await expect(recoverIntoEmptyOrigin(json, current, storage)).rejects.toThrow(/ativação/);
    expect(active).toBe(current);
    expect((await open(current).readSnapshot()).accounts).toEqual([]);
    fail = false;
    expect(await recoverIntoEmptyOrigin(json, current, storage)).toBe(owner);
    expect(active).toBe(owner);
    expect((await open(owner).readLocalState()).outbox).toHaveLength(state.outbox.length);
  });
});
