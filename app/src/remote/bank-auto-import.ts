import { bankImportEventId, prepareUniqueBankImportCommand, previewPluggyImport, type PluggyTransaction, type BankImportCandidate, type CommandContext, type LocalCommand } from '../application';
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
  readPage:(accountId:string,after?:string,dateFrom?:string,continuation?:string)=>Promise<unknown>;
  readState:()=>Promise<LocalFinancialState>;
  execute:(command:LocalCommand)=>Promise<void>;
  context:CommandContext;
  onProgress?:(pages:number,received:number)=>void;
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


/** The bank continuation is never used as a URL or forwarded verbatim. */
export function parseBankContinuation(next:unknown, accountId:string):string|null {
  if(next===null||next===undefined)return null;
  if(typeof next!=='string'||next.length===0||next.length>8192)
    throw new Error('Não foi possível interpretar a próxima página do banco (formato de paginação).');
  let query:string;
  if(next.startsWith('?'))query=next.slice(1);
  else if(next.startsWith('https://')){
    let url:URL;
    try{url=new URL(next);}catch{throw new Error('Endereço da próxima página inválido.');}
    if(url.origin!=='https://api.pluggy.ai'||url.pathname!=='/v2/transactions'||url.hash||url.username||url.password)
      throw new Error('Endereço de paginação não pertence à API autorizada.');
    query=url.search.slice(1);
  }else if(next.startsWith('/v2/transactions?'))query=next.slice('/v2/transactions?'.length);
  else if(next.startsWith('after=')||next.startsWith('accountId='))query=next;
  else throw new Error('Formato da próxima página não reconhecido.');
  const params=new URLSearchParams(query);
  const cursors=params.getAll('after');
  const ids=params.getAll('accountId');
  if(ids.length>1||ids.some(id=>id!==accountId))throw new Error('A paginação retornou uma conta bancária diferente.');
  if(cursors.length!==1||!cursors[0]||cursors[0].length>2048||/[\x00-\x1f]/.test(cursors[0]))
    throw new Error('O banco não forneceu um cursor válido para continuar.');
  // Untrusted parameters (including dateFrom, pageSize, other filters) are
  // discarded; the gateway always reapplies the approved account and period.
  return cursors[0];
}
export interface BankImportPreview {
  candidates:BankImportCandidate[];
  pages:number;
  received:number;
  eligible:number;
  pendingOrIgnored:number;
}
export async function previewLinkedBankAccount(link:BankLink,source:ImportSource):Promise<BankImportPreview>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(link.activatedOn))throw new Error('Data da autorização inválida.');
  if(link.activatedAt && !Number.isFinite(Date.parse(link.activatedAt)))throw new Error('Data do saldo inicial inválida.');
  const effectiveLink=withRecoveredOpeningBaseline(link,await source.readState());
  const collected:PluggyTransaction[]=[];
  let after:string|undefined;
  let continuation:string|undefined;
  const seen=new Set<string>();
  let received=0;
  for(let i=0;i<30;i++){
    let payload:unknown;
    try{payload=await source.readPage(link.pluggyAccountId,after,link.activatedOn,continuation);}
    catch(error){throw new Error('Falha na consulta da página '+(i+1)+': '+(error instanceof Error?error.message:'serviço indisponível'));}
    if(!payload||typeof payload!=='object')throw new Error('A página '+(i+1)+' retornou uma resposta inválida.');
    const page=payload as {results?:unknown;next?:unknown};
    if(!Array.isArray(page.results))throw new Error('A página '+(i+1)+' não contém uma lista válida.');
    const rows=page.results as PluggyTransaction[];
    if(rows.some(row=>!row||typeof row!=='object'||row.accountId!==link.pluggyAccountId))
      throw new Error('A página '+(i+1)+' contém uma transação de conta divergente.');
    received+=rows.length;
    collected.push(...rows.filter(row=>occurredAfterBaseline(row,effectiveLink)));
    source.onProgress?.(i+1,received);
    const cursor=parseBankContinuation(page.next,link.pluggyAccountId);
    if(cursor===null){
      const candidates=previewPluggyImport(link.itemId,collected);
      return {candidates,pages:i+1,received,eligible:collected.length,pendingOrIgnored:received-collected.length};
    }
    if(seen.has(cursor))throw new Error('O banco repetiu o cursor na página '+(i+1)+'. Nenhum lançamento foi gravado.');
    seen.add(cursor);
    after=cursor;
    // Preserve Pluggy's complete opaque next query. The server validates
    // its account and forwards it unchanged to avoid cursor/filter mismatch.
    continuation=typeof page.next==='string'&&page.next.startsWith('?')?page.next:undefined;
  }
  throw new Error('Extrato muito extenso (mais de 30 páginas). Escolha um período mais recente; nenhum lançamento foi gravado.');
}
/** Preflight categorization reads the actual financial ledger before asking the user to import. */
export interface BankImportPreflight {
  newCount:number;
  existingInDestination:number;
  existingInOtherAccount:number;
  otherAccountNames:string[];
}
export async function classifyBankImportCandidates(
  candidates:readonly BankImportCandidate[],state:LocalFinancialState,
  destinationAccountId:string,ownerId:string,
):Promise<BankImportPreflight>{
  const events=new Map(state.events.map(event=>[event.id,event]));
  const otherAccountIds=new Set<string>();
  let newCount=0,existingInDestination=0,existingInOtherAccount=0;
  for(const candidate of candidates){
    const id=await bankImportEventId(ownerId,candidate.externalKey);
    const existing=events.get(id);
    if(!existing){newCount++;continue;}
    if(existing.accountId===destinationAccountId){existingInDestination++;continue;}
    existingInOtherAccount++;
    otherAccountIds.add(existing.accountId);
  }
  return {
    newCount,existingInDestination,existingInOtherAccount,
    otherAccountNames:[...otherAccountIds].map(id=>state.accounts.find(account=>account.id===id)?.name||'Conta não identificada'),
  };
}
/** Run only after a complete validated preview and explicit user approval. */
export async function commitBankImportPreview(link:BankLink,candidates:BankImportCandidate[],source:ImportSource):Promise<number>{
  let count=0;
  for(const candidate of candidates){
    const current=await source.readState();
    const prepared=await prepareUniqueBankImportCommand(
      candidate,{pluggyAccountId:link.pluggyAccountId,atlasAccountId:link.atlasAccountId},current,source.context,
    );
    if(!prepared)continue;
    try{await source.execute(prepared);}
    catch(error){throw new Error('Importação interrompida após '+count+' lançamento(s). Os itens anteriores foram preservados, e a repetição é protegida por ID bancário. '+(error instanceof Error?error.message:''));}
    count++;
  }
  return count;
}
export async function syncLinkedBankAccount(link:BankLink,source:ImportSource):Promise<number>{
  const preview=await previewLinkedBankAccount(link,source);
  return commitBankImportPreview(link,preview.candidates,source);
}
