import { serializeFinancialDataset } from '../serialization';
import type { LocalSyncStore } from './local-sync-store';

/** Consistent I3 copy, distinct from the I2 recovery format. Never reads Auth storage. */
export async function exportSyncBackup(store:LocalSyncStore,serverId:string):Promise<string> {
  const state=await store.read();
  return JSON.stringify({
    format:'atlas-financeiro-sync-backup',schemaVersion:1,protocolVersion:1,
    exportedAt:new Date().toISOString(),userId:store.userId,serverId,
    confirmed:JSON.parse(serializeFinancialDataset(state.confirmed,store.userId)),
    projection:JSON.parse(serializeFinancialDataset(state.projection,store.userId)),
    pending:state.pending,receipts:state.receipts,meta:state.meta,
  },null,2);
}
