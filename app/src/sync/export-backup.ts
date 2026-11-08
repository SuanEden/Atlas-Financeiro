import { jsonDigest } from './protocol';
import { serializeFinancialDataset } from '../serialization';
import { validateSyncBackup, MAX_SYNC_BACKUP_BYTES, type LocalSyncStore } from './local-sync-store';

/** Consistent I3 copy, distinct from the I2 recovery format. Never reads Auth storage. */
export async function exportSyncBackup(store:LocalSyncStore,serverId:string):Promise<string> {
  if(serverId!==store.serverId) throw new TypeError('O servidor da cópia deve corresponder à base local.');
  const state=await store.read();
  const copy = {
    format:'atlas-financeiro-sync-backup',schemaVersion:1,protocolVersion:1,
    exportedAt:new Date().toISOString(),userId:store.userId,serverId,
    confirmed:JSON.parse(serializeFinancialDataset(state.confirmed,store.userId)),
    projection:JSON.parse(serializeFinancialDataset(state.projection,store.userId)),
    pending:state.pending,receipts:state.receipts,meta:state.meta,
  };
  const {exportedAt: _date, ...contents} = copy;
  const json = JSON.stringify({...copy, integritySha256: await jsonDigest(contents)}, null, 2);
  // Validate the very bytes presented for download. A tampered pending envelope,
  // missing receipt, inconsistent projection, or oversized copy must fail closed
  // rather than giving the user a backup that cannot be restored.
  if(new TextEncoder().encode(json).byteLength>MAX_SYNC_BACKUP_BYTES)
    throw new RangeError('A cópia ultrapassa o limite seguro de 10 MiB; os dados originais foram preservados.');
  await validateSyncBackup(json,store.userId,serverId);
  return json;
}
