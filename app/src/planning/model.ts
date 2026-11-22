/** Personal planning is intentionally separate from the immutable financial ledger.
 * Values entered here are NOT settlements, income, account balances or Pluggy imports.
 * This module is safe to bundle publicly because it contains NO personal amounts.
 */
export type GoalStatus = 'active' | 'paused' | 'completed';
export type Importance = 'essential' | 'important' | 'optional';
export type PlanFrequency = 'once'|'weekly'|'biweekly'|'monthly'|'quarterly'|'semiannual'|'annual'|'custom';
export type DueState = 'historical'|'needs_confirmation'|'planned';
export interface Allocation { id:string; accountId:string; cents:number; on:string; canceledAt?:string; }
export interface Goal { id:string; name:string; targetCents:number|null; deadline:string|null; priority:'high'|'medium'|'low'; status:GoalStatus; allocations:Allocation[]; }
export interface PlannedRecurrence {
  id:string; name:string; direction:'income'|'expense'; cents:number|null;
  frequency:PlanFrequency; customIntervalDays:number|null; dueDay:number|null;
  necessity:Importance|null; status:'draft'|'active'|'paused'; categoryId:string|null;
  shared:boolean;
}
export interface PlannedObligation {
  id:string; name:string; cents:number|null; status:DueState;
  dueDate:string|null; linkedEventId:string|null; notes:string;
}
export interface Contribution { id:string; participant:string; cents:number; on:string; canceledAt?:string; }
export interface SharedExpense {
  id:string; name:string; totalCents:number; personalCents:number;
  participants:string[]; contributions:Contribution[]; carriedCreditCents:number; status:'active'|'paused';
}
export interface ApprovedRule {
  id:string; identifierType:'merchant_id'|'counterparty_id';
  identifier:string; categoryId:string; approvedAt:string; enabled:boolean;
}
export interface AccountPreference {
  accountId:string; institution:string;
  liquidity:'immediate'|'restricted'|'unknown'; usageRestriction:string;
}
export interface FinancialPlan {
  schemaVersion:1; ownerId:string; revision:number;
  goals:Goal[]; recurrences:PlannedRecurrence[]; obligations:PlannedObligation[];
  shared:SharedExpense[]; rules:ApprovedRule[]; accountPreferences:AccountPreference[];
}
export const emptyPlan=(ownerId:string):FinancialPlan=>({
  schemaVersion:1,ownerId,revision:0,goals:[],recurrences:[],obligations:[],
  shared:[],rules:[],accountPreferences:[]
});
export const proposedGoals = [
  'Reserva de emergência','Casamento','Quitação de dívidas','Faculdade',
  'Academia','Compra de motocicleta','Compra de imóvel','Investimentos de longo prazo',
] as const;
export const proposedRecurringNames = ['Internet','ChatGPT','Spotify'] as const;
export const positiveCents=(value:bigint):number=>{
  if(value<=0n||value>999_999_999_99n)throw new RangeError('Informe um valor positivo dentro do limite.');
  return Number(value);
};
function validMoney(value:unknown,nullable=false):boolean {
  return (nullable&&value===null)||(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=99_999_999_999);
}
function text(value:unknown,label:string,max=200):string {
  if(typeof value!=='string'||value.trim().length===0||value.trim().length>max)
    throw new TypeError(label+' inválido.');
  return value.trim();
}
function nullableDate(value:unknown,label:string):void {
  if(value===null)return;
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new TypeError(label+' inválida.');
  const d=new Date(value+'T12:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw new TypeError(label+' inválida.');
}
function uuid(value:unknown):value is string {
  return typeof value==='string'&&/^[a-zA-Z0-9_-]{1,160}$/.test(value);
}
function idsUnique(values:readonly {id:string}[],label:string):void {
  if(new Set(values.map(v=>v.id)).size!==values.length)throw new TypeError('Identificador duplicado em '+label+'.');
}
function isRecord(value:unknown):value is Record<string,unknown> {
  return !!value&&typeof value==='object'&&!Array.isArray(value);
}
function arrayOf(value:unknown,label:string,max=1000):Record<string,unknown>[] {
  if(!Array.isArray(value)||value.length>max||!value.every(isRecord))throw new TypeError(label+' inválido.');
  return value;
}
/** Reject malformed or oversized imports before allowing any persistent write. */
export function validatePlan(input:unknown,ownerId?:string):asserts input is FinancialPlan {
  if(!isRecord(input)||input.schemaVersion!==1||!uuid(input.ownerId)||
     (ownerId!==undefined&&input.ownerId!==ownerId)||
     !Number.isSafeInteger(input.revision)||Number(input.revision)<0)
    throw new TypeError('Formato ou proprietário do planejamento inválido.');
  const goals=arrayOf(input.goals,'Metas');
  const recurrences=arrayOf(input.recurrences,'Recorrências');
  const obligations=arrayOf(input.obligations,'Obrigações');
  const shared=arrayOf(input.shared,'Despesas compartilhadas');
  const rules=arrayOf(input.rules,'Regras');
  const prefs=arrayOf(input.accountPreferences,'Contas');
  for(const [label,arr] of [['metas',goals],['recorrências',recurrences],['obrigações',obligations],['compartilhamentos',shared],['regras',rules]] as const){
    if(arr.some(row=>!uuid(row.id)))throw new TypeError('ID inválido em '+label);
    idsUnique(arr as {id:string}[],label);
  }
  for(const row of goals){
    text(row.name,'Nome da meta');
    if(!validMoney(row.targetCents,true))throw new TypeError('Valor-alvo inválido.');
    nullableDate(row.deadline,'Prazo da meta');
    if(!['high','medium','low'].includes(String(row.priority))||!['active','paused','completed'].includes(String(row.status)))
      throw new TypeError('Prioridade ou estado da meta inválido.');
    const a=arrayOf(row.allocations,'Aportes da meta');
    if(a.some(x=>!uuid(x.id)||!uuid(x.accountId)||!validMoney(x.cents)||x.cents===0))throw new TypeError('Aporte inválido.');
    a.forEach(x=>{nullableDate(x.on,'Data do aporte');if(x.canceledAt!==undefined)nullableDate(x.canceledAt,'Data do cancelamento');});
    idsUnique(a as {id:string}[],'aportes');
    if(a.some(x=>x.on===null))throw new TypeError('Data do aporte obrigatória.');
  }
  for(const row of recurrences){
    text(row.name,'Recorrência');
    if(!['income','expense'].includes(String(row.direction))||!validMoney(row.cents,true)||
      !['once','weekly','biweekly','monthly','quarterly','semiannual','annual','custom'].includes(String(row.frequency))||
      !['draft','active','paused'].includes(String(row.status))||
      !(row.necessity===null||['essential','important','optional'].includes(String(row.necessity)))||
      !(row.categoryId===null||uuid(row.categoryId))||typeof row.shared!=='boolean')
      throw new TypeError('Dados da recorrência inválidos.');
    if(row.dueDay!==null&&(!Number.isInteger(row.dueDay)||Number(row.dueDay)<1||Number(row.dueDay)>31))
      throw new TypeError('Dia de cobrança inválido.');
    if(row.frequency==='custom'&&(!Number.isInteger(row.customIntervalDays)||Number(row.customIntervalDays)<1||Number(row.customIntervalDays)>3650))
      throw new TypeError('Intervalo personalizado inválido.');
    if(row.frequency!=='custom'&&row.customIntervalDays!==null)throw new TypeError('Intervalo personalizado inesperado.');
    if(row.status==='active'&&row.cents===null)throw new TypeError('Confirme o valor antes de ativar uma recorrência.');
  }
  for(const row of obligations){
    text(row.name,'Obrigação');
    if(!validMoney(row.cents,true)||!['historical','needs_confirmation','planned'].includes(String(row.status))||
      !(row.linkedEventId===null||uuid(row.linkedEventId))||
      typeof row.notes!=='string'||row.notes.length>1000)throw new TypeError('Obrigação inválida.');
    nullableDate(row.dueDate,'Vencimento');
    // Only a real ledger operation may settle an obligation; planning never does.
  }
  for(const row of shared){
    text(row.name,'Assinatura compartilhada');
    if(!validMoney(row.totalCents)||!validMoney(row.personalCents)||!validMoney(row.carriedCreditCents)||
      Number(row.personalCents)>Number(row.totalCents)||!['active','paused'].includes(String(row.status)))
      throw new TypeError('Valores de compartilhamento inválidos.');
    if(!Array.isArray(row.participants)||row.participants.length>50||row.participants.some(v=>typeof v!=='string'||v.length===0||v.length>120)||
      new Set(row.participants).size!==row.participants.length)throw new TypeError('Participantes inválidos.');
    const contributions=arrayOf(row.contributions,'Contribuições');
    for(const c of contributions){
      if(!uuid(c.id)||typeof c.participant!=='string'||!row.participants.includes(c.participant)||
        !validMoney(c.cents)||c.cents===0)throw new TypeError('Contribuição inválida.');
      nullableDate(c.on,'Data da contribuição');if(c.canceledAt!==undefined)nullableDate(c.canceledAt,'Data do cancelamento');
      if(c.on===null)throw new TypeError('Data da contribuição obrigatória.');
    }
    idsUnique(contributions as {id:string}[],'contribuições');
  }
  for(const row of rules){
    if(!['merchant_id','counterparty_id'].includes(String(row.identifierType))||
      !uuid(row.categoryId)||!uuid(row.identifier)||typeof row.enabled!=='boolean')
      throw new TypeError('Regra de classificação inválida.');
    nullableDate(row.approvedAt,'Data de autorização');
    if(row.approvedAt===null)throw new TypeError('Autorização da regra ausente.');
  }
  if(new Set(rules.map(r=>r.identifierType+':'+r.identifier)).size!==rules.length)throw new TypeError('Regras conflitantes para o mesmo identificador.');
  for(const row of prefs){
    if(!uuid(row.accountId)||typeof row.institution!=='string'||row.institution.length>120||
      typeof row.usageRestriction!=='string'||row.usageRestriction.length>240||
      !['immediate','restricted','unknown'].includes(String(row.liquidity)))throw new TypeError('Preferências de conta inválidas.');
  }
  if(new Set(prefs.map(row=>row.accountId)).size!==prefs.length)throw new TypeError('Preferências de conta duplicadas.');
}
export function sumGoalAllocations(goal:Goal):number {
  return goal.allocations.reduce((sum,x)=>sum+(x.canceledAt?0:x.cents),0);
}
export function reservedForAccount(plan:FinancialPlan,accountId:string):number {
  return plan.goals.reduce((sum,goal)=>sum+goal.allocations.filter(a=>a.accountId===accountId&&!a.canceledAt).reduce((n,a)=>n+a.cents,0),0);
}
export function canReserve(plan:FinancialPlan,accountId:string,cents:number,confirmedFreeBalanceCents:number):boolean {
  return Number.isSafeInteger(cents)&&cents>0&&confirmedFreeBalanceCents>=0&&
    reservedForAccount(plan,accountId)+cents<=confirmedFreeBalanceCents;
}
export function sharedSummary(expense:SharedExpense){
  const received=expense.contributions.reduce((sum,row)=>sum+(row.canceledAt?0:row.cents),0);
  const covered=received+expense.carriedCreditCents;
  const expected=Math.max(0,expense.totalCents-expense.personalCents);
  return {receivedCents:received,coveredCents:covered,pendingCents:Math.max(0,expected-covered),surplusCents:Math.max(0,covered-expected)};
}
/** Category learning requires verified identifier, never text similarity. */
export function applyApprovedRule(plan:FinancialPlan,identifierType:ApprovedRule['identifierType'],identifier:string):string|undefined {
  return plan.rules.find(r=>r.enabled&&r.identifierType===identifierType&&r.identifier===identifier)?.categoryId;
}
export function mergeImportedPlan(current:FinancialPlan,imported:FinancialPlan):FinancialPlan{
  validatePlan(current);validatePlan(imported);
  const unique=<T extends {id:string}>(left:T[],right:T[]):T[]=>{
    const map=new Map(left.map(row=>[row.id,row]));
    for(const row of right){
      const prior=map.get(row.id);
      if(prior&&JSON.stringify(prior)!==JSON.stringify(row))throw new TypeError('Há registros com o mesmo ID e conteúdos diferentes. A importação foi bloqueada para preservar dados.');
      if(!prior)map.set(row.id,row);
    }
    return [...map.values()];
  };
  const prefs=new Map(current.accountPreferences.map(row=>[row.accountId,row]));
  for(const row of imported.accountPreferences){
    const prev=prefs.get(row.accountId);
    if(prev&&JSON.stringify(prev)!==JSON.stringify(row))throw new TypeError('Preferências de conta divergentes. Nenhum dado foi importado.');
    if(!prev)prefs.set(row.accountId,row);
  }
  const merged:FinancialPlan={
    ...current,revision:current.revision+1,
    goals:unique(current.goals,imported.goals),
    recurrences:unique(current.recurrences,imported.recurrences),
    obligations:unique(current.obligations,imported.obligations),
    shared:unique(current.shared,imported.shared),rules:unique(current.rules,imported.rules),
    accountPreferences:[...prefs.values()]
  };
  validatePlan(merged,current.ownerId);
  return merged;
}
