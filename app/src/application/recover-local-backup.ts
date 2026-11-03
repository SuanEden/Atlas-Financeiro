import { validateI2Backup, canonicalLocalState } from '../backup/validate-i2-backup';
import { createLocalFinancialStore } from '../persistence';
import { LOCAL_OWNER_KEY } from './local-identity';
import { validateBankLinks } from '../backup/bank-links';
import { canonicalJson } from '../serialization/canonical-json';

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
      const linkKey = 'atlas:pluggy-mappings:v1:' + backup.userId;
      const accountIds = new Set(backup.state.accounts.map(account => account.id));
      const existingLinks = storage.getItem(linkKey);
      if (Object.keys(backup.bankLinks).length && existingLinks !== null) {
        let validated;
        try { validated = validateBankLinks(JSON.parse(existingLinks), accountIds); }
        catch { throw new Error('Já existem vínculos bancários incompatíveis. Nada foi substituído.'); }
        if (canonicalJson(validated) !== canonicalJson(backup.bankLinks))
          throw new Error('Os vínculos bancários deste navegador são diferentes dos presentes no backup.');
      }
      await target.recoverI2Backup(json);
      // Copy links only after the financial dataset is safely stored. No
      // automatic Google/Pluggy authorization is performed by restoration.
      if (Object.keys(backup.bankLinks).length && existingLinks === null)
        storage.setItem(linkKey, JSON.stringify(backup.bankLinks));
      // If pointer activation fails, the original remains active and retry recognizes the complete target.
      storage.setItem(LOCAL_OWNER_KEY, backup.userId);
      return backup.userId;
    } finally { current.close(); target.close(); }
  });
}
