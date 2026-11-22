import Dexie, { type Table } from 'dexie';
import { emptyPlan, mergeImportedPlan, validatePlan, type FinancialPlan } from './model';
import { mergePlanningThreeWay, samePlanContent, verifyPlanningCloudSnapshot, PlanningCloudConflict, type PlanningCloudBaseline, type PlanningCloudPort, type PlanningCloudSnapshot } from './cloud-model';

class PlanningDb extends Dexie {
  documents!:Table<FinancialPlan,string>;
  syncState!:Table<PlanningCloudBaseline,string>;
  constructor(){
    super('atlas-financeiro-personal-planning-v1');
    this.version(1).stores({documents:'&ownerId'});
    // Upgrade in place: preserve every existing personal plan.
    this.version(2).stores({documents:'&ownerId',syncState:'&ownerId'});
  }
}
const db=new PlanningDb();
export async function readPlanning(ownerId:string):Promise<FinancialPlan>{
  const record=await db.documents.get(ownerId);
  if(!record)return emptyPlan(ownerId);
  validatePlan(record,ownerId);
  return record;
}
/** Serialize multi-tab updates through one IndexedDB write transaction. */
export async function mutatePlanning(
  ownerId:string,
  mutate:(previous:FinancialPlan)=>FinancialPlan,
):Promise<FinancialPlan>{
  return db.transaction('rw',db.documents,async()=>{
    const previous=(await db.documents.get(ownerId))??emptyPlan(ownerId);
    validatePlan(previous,ownerId);
    const next=mutate(structuredClone(previous));
    validatePlan(next,ownerId);
    if(next.revision!==previous.revision+1)throw new TypeError('Revisão concorrente ou inválida.');
    await db.documents.put(next);
    return next;
  });
}
/** Import merges records by stable ID, rejecting conflicts (never overwriting local history). */
export async function importPlanning(ownerId:string,raw:string):Promise<FinancialPlan>{
  if(raw.length>1_000_000)throw new TypeError('Arquivo de planejamento muito grande.');
  let parsed:unknown;
  try{parsed=JSON.parse(raw);}catch{throw new TypeError('JSON inválido.');}
  validatePlan(parsed);
  const plan={...parsed,ownerId} as FinancialPlan;
  validatePlan(plan,ownerId);
  return mutatePlanning(ownerId,current=>mergeImportedPlan(current,plan));
}
export function exportPlanning(plan:FinancialPlan):string{
  validatePlan(plan);
  return JSON.stringify(plan,null,2);
}

export async function readPlanningCloudEnabled(ownerId:string):Promise<boolean>{
  return Boolean((await db.syncState.get(ownerId))?.enabled);
}
export async function setPlanningCloudEnabled(ownerId:string,enabled:boolean):Promise<void>{
  await db.transaction('rw',db.syncState,async()=>{
    const old=await db.syncState.get(ownerId);
    await db.syncState.put(old?{...old,enabled}:{ownerId,enabled,cloudRevision:0,base:null});
  });
}
async function readSyncSnapshot(ownerId:string):Promise<{local:FinancialPlan;baseline:PlanningCloudBaseline}> {
  return db.transaction('r',db.documents,db.syncState,async()=>{
    const local=(await db.documents.get(ownerId))??emptyPlan(ownerId);
    validatePlan(local,ownerId);
    const baseline=(await db.syncState.get(ownerId))??{ownerId,cloudRevision:0,base:null,enabled:false};
    if(baseline.base)validatePlan(baseline.base,ownerId);
    return {local,baseline};
  });
}
async function recordCloudResult(ownerId:string,started:FinancialPlan,merged:FinancialPlan,server:PlanningCloudSnapshot):Promise<{plan:FinancialPlan;changedLocally:boolean}>{
  verifyPlanningCloudSnapshot(ownerId,server);
  if(!server.document)throw new Error('O servidor não confirmou o Planejamento.');
  return db.transaction('rw',db.documents,db.syncState,async()=>{
    const current=(await db.documents.get(ownerId))??emptyPlan(ownerId);
    validatePlan(current,ownerId);
    const state=await db.syncState.get(ownerId);
    if(!state?.enabled)throw new Error('Sincronização desativada durante a operação.');
    const unchanged=current.revision===started.revision&&samePlanContent(current,started);
    const plan=unchanged&&!samePlanContent(current,merged)
      ?{...merged,revision:current.revision+1}
      :current;
    validatePlan(plan,ownerId);
    if(unchanged&&plan!==current)await db.documents.put(plan);
    await db.syncState.put({
      ownerId,enabled:true,cloudRevision:server.revision,base:server.document
    });
    return {plan,changedLocally:!unchanged};
  });
}

/** One foreground reconciliation. No financial event, balance or receipt can be written. */
export async function syncPlanningCloud(ownerId:string,cloud:PlanningCloudPort):Promise<{plan:FinancialPlan;changedLocally:boolean;cloudRevision:number}> {
  const {local,baseline}=await readSyncSnapshot(ownerId);
  if(!baseline.enabled)throw new Error('Ative a sincronização do Planejamento antes de enviar dados.');
  const initial=await cloud.read();
  verifyPlanningCloudSnapshot(ownerId,initial);
  if(initial.revision<baseline.cloudRevision)
    throw new PlanningCloudConflict('O servidor parece ter perdido uma versão anterior. Nada foi sobrescrito.');

  let remote=initial;
  let merged=mergePlanningThreeWay(ownerId,baseline.base,local,remote.document);
  for(let attempt=0;attempt<3;attempt++){
    if(remote.document&&samePlanContent(remote.document,merged))break;
    const result=await cloud.write(remote.revision,merged);
    verifyPlanningCloudSnapshot(ownerId,result);
    remote=result;
    if(result.applied)break;
    if(attempt===2)throw new PlanningCloudConflict('Houve muitas alterações concorrentes. Tente sincronizar novamente.');
    merged=mergePlanningThreeWay(ownerId,baseline.base,local,result.document);
  }
  if(!remote.document)throw new Error('Sincronização sem confirmação do servidor.');
  const saved=await recordCloudResult(ownerId,local,merged,remote);
  return {...saved,cloudRevision:remote.revision};
}
