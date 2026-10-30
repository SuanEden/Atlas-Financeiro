// Browser-only synthetic entry, substituted by Playwright. Never imported by production.
import { createRoot } from 'react-dom/client';
import { RemoteApp } from '../src/remote/RemoteApp';
import { RemoteController } from '../src/remote/controller';
import { SyncFailure, type SyncTransport } from '../src/sync/engine';
import type { AuthPort } from '../src/auth/supabase-adapter';
import { jsonDigest, type ChangeBatch, type SyncEnvelope } from '../src/sync/protocol';
import type { LocalFinancialState } from '../src/domain';
import '../src/styles.css';

const owner='a3000000-0000-4000-8000-000000000001';
const sourceOwner='a3000000-0000-4000-8000-000000000002';
const empty:LocalFinancialState={accounts:[],categories:[],events:[],settlements:[],postings:[],outbox:[]};
const batches=():ChangeBatch[]=>JSON.parse(localStorage.getItem('synthetic-remote-batches')??'[]');
const transport:SyncTransport={
  async apply(envelope:SyncEnvelope) {
    if(localStorage.getItem('synthetic-offline'))throw new SyncFailure('offline','SYNTHETIC_OFFLINE');
    const rows=batches();const prior=rows.find((row)=>row.envelope.operationId===envelope.operationId);
    if(prior)return prior.receipt;
    const revision=String(rows.length+1);
    const receipt={protocolVersion:1 as const,userId:owner,operationId:envelope.operationId,revision,digest:await jsonDigest(envelope),coveredOperations:envelope.kind==='bootstrap'?await Promise.all(envelope.coveredOperations.map(async(operation)=>({id:operation.id,digest:await jsonDigest(operation)}))):[]};
    rows.push({revision,envelope,receipt});localStorage.setItem('synthetic-remote-batches',JSON.stringify(rows));return receipt;
  },
  async pull(after,through) {
    if(localStorage.getItem('synthetic-offline'))throw new SyncFailure('offline','SYNTHETIC_OFFLINE');
    const rows=batches();const end=through??String(rows.length);
    return {protocolVersion:1,userId:owner,after,through:end,cursor:end,batches:rows.filter((row)=>BigInt(row.revision)>BigInt(after)&&BigInt(row.revision)<=BigInt(end))};
  },
};
const auth:AuthPort={
  async verify() {
    if(localStorage.getItem('synthetic-offline'))throw new SyncFailure('offline','SYNTHETIC_OFFLINE');
    if(!localStorage.getItem('synthetic-signed-in'))throw new SyncFailure('login_required','SYNTHETIC_NO_SESSION');
    return {userId:owner,expiresAt:Date.now()+60_000,writesEnabled:true};
  },
  async login(){localStorage.setItem('synthetic-signed-in','yes');await controller.verify(true);},
  async logout(){localStorage.removeItem('synthetic-signed-in');if(localStorage.getItem('synthetic-offline'))throw new Error('Synthetic offline');},
  async callback(){},onChange(){return ()=>{};},
};
const controller=new RemoteController('synthetic-browser',auth,transport,localStorage,{read:async()=>({ownerId:sourceOwner,state:empty})});
void controller.start();
createRoot(document.getElementById('root')!).render(<RemoteApp controller={controller} />);

// Exports are test-driver controls, absent from every production entry.
export async function expireAndDisconnect() {localStorage.setItem('synthetic-offline','yes');await controller.verify();}
export async function reconnect() {localStorage.removeItem('synthetic-offline');await controller.verify(true);}
export async function inspect() {return {view:controller.getSnapshot().session,...await controller.getSnapshot().store?.read()};}
