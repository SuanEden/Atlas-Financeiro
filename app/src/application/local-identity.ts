import { newLocalId } from './local-id';
export const LOCAL_OWNER_KEY = 'atlas-financeiro:local-owner:v1';

/** Local owner IDs isolate browser data; they are not authentication. */
export function getOrCreateLocalOwnerId(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): string {
  const existing = storage.getItem(LOCAL_OWNER_KEY);
  if (existing !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(existing)) {
    return existing;
  }
  const created = newLocalId();
  storage.setItem(LOCAL_OWNER_KEY, created);
  return created;
}

