import Dexie, { type Table } from 'dexie';
import { emptyPlan, mergeImportedPlan, validatePlan, type FinancialPlan } from './model';

class PlanningDb extends Dexie {
  documents!:Table<FinancialPlan,string>;
  constructor(){
    super('atlas-financeiro-personal-planning-v1');
    this.version(1).stores({documents:'&ownerId'});
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
