import { prepareUniqueBankImportCommand, previewPluggyImport, type PluggyTransaction, type CommandContext, type LocalCommand } from '../application';
import type { LocalFinancialState } from '../domain';

/** One approved bank-account-to-Atlas-account mapping. No financial writes occur without it. */
export interface BankLink {
  itemId:string;
  pluggyAccountId:string;
  atlasAccountId:string;
  activatedOn:string;
  /** Bank snapshot timestamp, when available; avoids missing same-day movements. */
  activatedAt?:string;
}
export interface ImportSource {
  readPage:(accountId:string,after?:string,dateFrom?:string)=>Promise<unknown>;
  readState:()=>Promise<LocalFinancialState>;
  execute:(command:LocalCommand)=>Promise<void>;
  context:CommandContext;
}
/**
 * Recover a time boundary only for an account whose original local operation
 * proves that the opening balance was created from a Pluggy snapshot.
 * An unknown/manual origin keeps the conservative date-only cutoff.
 */
export function withRecoveredOpeningBaseline(link:BankLink,state:LocalFinancialState):BankLink {
  if(link.activatedAt||!state.accounts.some(a=>a.id===link.atlasAccountId))return link;
  const day=Date.parse(link.activatedOn+'T00:00:00.000Z');
  if(!Number.isFinite(day))return link;
  for(const operation of state.outbox){
    if(operation.kind!=='create_account')continue;
    const created=Date.parse(operation.createdAt);
    // Timezones may put a local-day operation on the next UTC day.
    // Never reuse a creation time from an older unrelated account.
    if(!Number.isFinite(created)||created<day-12*3600000||created>day+36*3600000)continue;
    try{
      const payload=JSON.parse(operation.payloadJson) as {
        accounts?:Array<{id?:string}>;
        events?:Array<{accountId?:string;source?:string}>;
      };
      if(payload.accounts?.some(a=>a.id===link.atlasAccountId)&&
         payload.events?.some(e=>e.accountId===link.atlasAccountId&&e.source==='opening_balance')){
        return {...link,activatedAt:operation.createdAt};
      }
    }catch{/* Invalid source cannot relax the import cutoff. */}
  }
  return link;
}
function occurredAfterBaseline(row:PluggyTransaction,link:BankLink):boolean {
  if(row.status!=='POSTED'||typeof row.date!=='string')return false;
  if(link.activatedAt){
    const baseline=Date.parse(link.activatedAt);
    const occurred=/^\d{4}-\d{2}-\d{2}T/.test(row.date)
      ? Date.parse(row.date)
      : /^\d{4}-\d{2}-\d{2}$/.test(row.date)
        ? Date.parse(row.date+'T00:00:00.000Z'):NaN;
    // Date-only rows may have occurred before the balance snapshot.
    return Number.isFinite(baseline)&&Number.isFinite(occurred)&&occurred>baseline;
  }
  return row.date.slice(0,10)>link.activatedOn;
}

export async function syncLinkedBankAccount(link:BankLink,source:ImportSource):Promise<number>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(link.activatedOn))throw new Error('Data da autorização inválida.');
  if(link.activatedAt && !Number.isFinite(Date.parse(link.activatedAt)))throw new Error('Data do saldo inicial inválida.');
  const effectiveLink=withRecoveredOpeningBaseline(link,await source.readState());
  const collected:PluggyTransaction[]=[];
  let after:string|undefined;
  let complete=false;
  const seen=new Set<string>();
  for(let i=0;i<10;i++){
    const payload=await source.readPage(link.pluggyAccountId,after,link.activatedOn);
    if(!payload||typeof payload!=='object')throw new Error('Resposta bancária inválida.');
    const page=payload as {results?:unknown;next?:unknown};
    if(!Array.isArray(page.results))throw new Error('Extrato bancário sem lista válida.');
    const results=page.results as PluggyTransaction[];
    if(results.some(t=>!t||typeof t!=='object'||t.accountId!==link.pluggyAccountId))throw new Error('Transação vinculada à conta incorreta.');
    collected.push(...results.filter(t=>occurredAfterBaseline(t,effectiveLink)));
    if(page.next==null){complete=true;break;}
    if(typeof page.next!=='string'||!page.next.startsWith('?'))throw new Error('Cursor bancário inválido.');
    const next=new URLSearchParams(page.next.slice(1));
    const cursor=next.get('after');
    if(next.get('accountId')!==link.pluggyAccountId||!cursor||cursor.length>2048||seen.has(cursor))throw new Error('Paginação bancária inconsistente.');
    seen.add(cursor);after=cursor;
  }
  if(!complete)throw new Error('Extrato excede limite de consulta segura; nenhuma importação realizada.');
  const candidates=previewPluggyImport(link.itemId,collected);
  let count=0;
  for(const candidate of candidates){
    const current=await source.readState();
    const prepared=await prepareUniqueBankImportCommand(
      candidate,{pluggyAccountId:link.pluggyAccountId,atlasAccountId:link.atlasAccountId},current,source.context,
    );
    if(!prepared)continue;
    await source.execute(prepared);
    count++;
  }
  return count;
}
