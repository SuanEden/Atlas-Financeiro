import {
  emptyPlan, validatePlan, type FinancialPlan,
} from './model';

export interface PlanningCloudSnapshot {
  revision: number;
  document: FinancialPlan | null;
}
export interface PlanningCloudWriteResult extends PlanningCloudSnapshot {
  applied: boolean;
}
export interface PlanningCloudPort {
  read(): Promise<PlanningCloudSnapshot>;
  write(expectedRevision:number,document:FinancialPlan):Promise<PlanningCloudWriteResult>;
}
export interface PlanningCloudBaseline {
  ownerId: string;
  cloudRevision: number;
  base: FinancialPlan | null;
  enabled: boolean;
}
export class PlanningCloudConflict extends Error {
  constructor(message='Dois dispositivos alteraram o mesmo registro do Planejamento. Nada foi sobrescrito. Exporte uma cópia em cada dispositivo para conferir as alterações.') {
    super(message);
    this.name='PlanningCloudConflict';
  }
}
const equal=(x:unknown,y:unknown)=>JSON.stringify(x)===JSON.stringify(y);

/** Top-level revision is local to each browser and is not a conflict signal. */
export function samePlanContent(a:FinancialPlan,b:FinancialPlan):boolean {
  const normalized=(p:FinancialPlan)=>({...p,revision:0,eventNecessities:p.eventNecessities??[]});
  return equal(normalized(a),normalized(b));
}

/** Three-way, record-level merge. No divergent edit or deletion can be silently lost. */
export function mergePlanningThreeWay(
  ownerId:string,base:FinancialPlan|null,local:FinancialPlan,remote:FinancialPlan|null,
):FinancialPlan {
  validatePlan(local,ownerId);
  if(base)validatePlan(base,ownerId);
  if(remote)validatePlan(remote,ownerId);

  const pick=<T>(key:string,original:T|undefined,ours:T|undefined,theirs:T|undefined):T|undefined=>{
    if(equal(ours,theirs))return ours;
    if(equal(original,ours))return theirs;
    if(equal(original,theirs))return ours;
    // A missing record can mean a delete or data loss. Keep the entire operation
    // blocked rather than re-creating/deleting an ambiguous record.
    throw new PlanningCloudConflict('Alterações diferentes no mesmo registro ('+key+'). Nada foi sobrescrito. Exporte as duas cópias para conferência.');
  };
  const records=<T>(label:string,key:(row:T)=>string,original:readonly T[],ours:readonly T[],theirs:readonly T[]):T[]=>{
    const a=new Map(original.map(x=>[key(x),x]));
    const b=new Map(ours.map(x=>[key(x),x]));
    const c=new Map(theirs.map(x=>[key(x),x]));
    const order=[...new Set([...b.keys(),...c.keys(),...a.keys()])];
    const result:T[]=[];
    for(const id of order) {
      const baseItem=a.get(id),localItem=b.get(id),remoteItem=c.get(id);
      if(baseItem!==undefined&&(localItem===undefined||remoteItem===undefined)&&!equal(localItem,remoteItem))
        throw new PlanningCloudConflict('Remoção ambígua em '+label+' ('+id+'). Nenhum registro foi descartado.');
      const value=pick(label+':'+id,baseItem,localItem,remoteItem);
      if(value!==undefined)result.push(value);
    }
    return result;
  };
  const original=base??emptyPlan(ownerId),theirs=remote??emptyPlan(ownerId);
  const merged:FinancialPlan={
    schemaVersion:1,ownerId,revision:Math.max(local.revision,theirs.revision)+1,
    goals:records('metas',x=>x.id,original.goals,local.goals,theirs.goals),
    recurrences:records('recorrências',x=>x.id,original.recurrences,local.recurrences,theirs.recurrences),
    obligations:records('obrigações',x=>x.id,original.obligations,local.obligations,theirs.obligations),
    shared:records('compartilhadas',x=>x.id,original.shared,local.shared,theirs.shared),
    rules:records('regras',x=>x.id,original.rules,local.rules,theirs.rules),
    accountPreferences:records('preferências',x=>x.accountId,original.accountPreferences,local.accountPreferences,theirs.accountPreferences),
    eventNecessities:records('necessidades',x=>x.eventId,original.eventNecessities??[],local.eventNecessities??[],theirs.eventNecessities??[]),
  };
  validatePlan(merged,ownerId);
  return merged;
}
export function verifyPlanningCloudSnapshot(ownerId:string,value:PlanningCloudSnapshot):void {
  if(!Number.isSafeInteger(value.revision)||value.revision<0)throw new Error('Revisão de Planejamento inválida no servidor.');
  if(value.document===null) {
    if(value.revision!==0)throw new Error('Revisão remota sem documento.');
  } else {
    if(value.revision===0)throw new Error('Documento remoto sem revisão.');
    validatePlan(value.document,ownerId);
  }
}
