import { validateI2Backup, canonicalLocalState } from '../backup/validate-i2-backup';
import { createLocalFinancialStore } from '../persistence';
import { LOCAL_OWNER_KEY } from './local-identity';

/** Cross-tab lock for recovery and financial writes in this build; no network requests. */
export async function withLocalWriteLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) return navigator.locks.request('atlas-financeiro:local-write:v1', work);
  // Browser UI does not enable cross-owner activation without Web Locks.
  return work();
}

export async function recoverIntoEmptyOrigin(json: string, currentOwnerId: string, storage: Pick<Storage, 'getItem' | 'setItem'>): Promise<string> {
  const backup = validateI2Backup(json);
  if (typeof navigator !== 'undefined' && !navigator.locks) throw new Error('Este navegador não oferece a coordenação necessária para recuperar com segurança. Use um navegador compatível.');
  return withLocalWriteLock(async () => {
    if (storage.getItem(LOCAL_OWNER_KEY) !== currentOwnerId) throw new Error('A base ativa mudou. Recarregue antes de recuperar.');
    const current = createLocalFinancialStore(currentOwnerId);
    const target = createLocalFinancialStore(backup.userId);
    try {
      const state = await current.readLocalState();
      if (Object.values(state).some((rows) => rows.length > 0)
        && (currentOwnerId !== backup.userId || canonicalLocalState(state, currentOwnerId) !== canonicalLocalState(backup.state, backup.userId))) {
        throw new Error('Este navegador já contém dados. Nada foi unido ou substituído. Use uma origem/perfil vazio.');
      }
      await target.recoverI2Backup(json);
      // If pointer activation fails, the original remains active and retry recognizes the complete target.
      storage.setItem(LOCAL_OWNER_KEY, backup.userId);
      return backup.userId;
    } finally { current.close(); target.close(); }
  });
}
