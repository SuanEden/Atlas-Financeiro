import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Landmark, LoaderCircle, RefreshCw } from 'lucide-react';
import type { CommandContext, LocalCommand } from '../application';
import type { LocalFinancialState } from '../domain';
import { classifyBankImportCandidates, commitBankImportPreview, previewLinkedBankAccount, type BankImportPreflight, type BankImportPreview, type BankLink } from './bank-auto-import';

type BankReader = { readBank(resource:'item'|'accounts'|'transactions',id?:string,after?:string,dateFrom?:string,continuation?:string):Promise<unknown> };
export type CloudBankImport = {
  accounts: LocalFinancialState['accounts'];
  readState: () => Promise<LocalFinancialState>;
  execute: (command: LocalCommand) => Promise<void>;
  context: CommandContext;
  canWrite: boolean;
};
type BankRow = { id?:string; name?:string; status?:string; type?:string; itemId?:string; description?:string; amount?:number; date?:string };
const banks=[
  {name:'Nubank',id:'71c06153-0d24-45ac-81f6-9de6f0d04282'},
  {name:'Infinite',id:'1c91ee97-e614-494f-b41a-5e203d5fa7ee'},
] as const;
function rows(payload:unknown):BankRow[]{
  if(!payload||typeof payload!=='object'||!Array.isArray((payload as {results?:unknown}).results))
    throw new Error('O banco não retornou uma lista válida.');
  return (payload as {results:unknown[]}).results.filter((r):r is BankRow=>r!==null&&typeof r==='object');
}
function dayBefore(value:string):string{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Escolha uma data inicial válida.');
  const date=new Date(value+'T12:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Data inicial inválida.');
  date.setUTCDate(date.getUTCDate()-1);
  return date.toISOString().slice(0,10);
}
function thirtyDaysAgo(today:string):string{
  const date=new Date(today+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()-30);
  return date.toISOString().slice(0,10);
}
const money=(amount:number)=>amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
type Review={preview:BankImportPreview;preflight:BankImportPreflight;link:BankLink;accountName:string;period:string};
export function PluggyReadPanel({controller,importTarget}:{controller:BankReader;importTarget?:CloudBankImport}){
  const [item,setItem]=useState<{id:string;name:string;status:string}|null>(null);
  const [accounts,setAccounts]=useState<BankRow[]>([]);
  const [selected,setSelected]=useState('');
  const [transactions,setTransactions]=useState<BankRow[]>([]);
  const [mapping,setMapping]=useState('');
  const [fromDate,setFromDate]=useState(()=>thirtyDaysAgo(importTarget?.context.today()??new Date().toISOString().slice(0,10)));
  const [review,setReview]=useState<Review|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState<'bank'|'account'|'review'|'commit'|null>(null);
  const [progress,setProgress]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  function invalidate(){
    setReview(null);setConfirmed(false);setError('');setNotice('');setProgress('');
  }
  async function run(kind:NonNullable<typeof busy>,operation:()=>Promise<void>){
    if(busy)return;
    setBusy(kind);setError('');setNotice('');
    try{await operation();}
    catch(reason){if(kind!=='commit')setReview(null);setConfirmed(false);setError(reason instanceof Error?reason.message:'Não foi possível concluir a operação.');}
    finally{setBusy(null);}
  }
  function chooseBank(bank:typeof banks[number]){
    void run('bank',async()=>{
      invalidate();
      setSelected('');setAccounts([]);setTransactions([]);setMapping('');
      const raw=await controller.readBank('item',bank.id) as BankRow;
      if(raw.status==='LOGIN_ERROR')throw new Error('O banco exige nova autorização na Pluggy.');
      const available=rows(await controller.readBank('accounts',bank.id));
      setItem({id:bank.id,name:bank.name,status:raw.status||'Não informado'});
      setAccounts(available);
    });
  }
  function chooseAccount(id:string){
    void run('account',async()=>{
      invalidate();setSelected('');setTransactions([]);setMapping('');
      const response=await controller.readBank('transactions',id);
      const firstPage=rows(response);
      setTransactions(firstPage);
      setSelected(id);
    });
  }
  async function analyze(){
    if(!importTarget||!item||!selected||!mapping||!fromDate||busy)return;
    await run('review',async()=>{
      invalidate();
      if(!importTarget.accounts.some(account=>account.id===mapping))
        throw new Error('A conta de destino não existe no Atlas.');
      if(fromDate>importTarget.context.today())throw new Error('A data inicial não pode estar no futuro.');
      const link={itemId:item.id,pluggyAccountId:selected,atlasAccountId:mapping,activatedOn:dayBefore(fromDate)};
      const preview=await previewLinkedBankAccount(link,{
        readPage:(id,after,from,continuation)=>controller.readBank('transactions',id,after,from,continuation),
        readState:importTarget.readState,execute:importTarget.execute,context:importTarget.context,
        onProgress:(pages,total)=>setProgress('Consultando página '+pages+' · '+total+' movimentações verificadas'),
      });
      const current=await importTarget.readState();
      const preflight=await classifyBankImportCandidates(preview.candidates,current,mapping,importTarget.context.userId);
      setReview({link,preview,preflight,accountName:importTarget.accounts.find(account=>account.id===mapping)!.name,period:fromDate});
      setProgress('');
    });
  }
  async function commit(){
    if(!importTarget||!review||!confirmed||!importTarget.canWrite||busy)return;
    await run('commit',async()=>{
      const now=await importTarget.readState();
      if(!now.accounts.some(a=>a.id===review.link.atlasAccountId))
        throw new Error('A conta de destino foi removida; refaça a conferência.');
      const count=await commitBankImportPreview(review.link,review.preview.candidates,{
        readPage:(id,after,from,continuation)=>controller.readBank('transactions',id,after,from,continuation),
        readState:importTarget.readState,execute:importTarget.execute,context:importTarget.context,
      });
      setReview(null);setConfirmed(false);
      setNotice(count
        ? count+' movimentação(ões) salva(s) na base local do Atlas. Confira a aba Movimentações e o status da nuvem.'
        : 'Nenhuma nova movimentação foi gravada. Todas as transações elegíveis já constam na base ou o registro não pôde ser realizado. Confira o histórico da conta.' );
    });
  }
  const selectedBankAccount=accounts.find(a=>a.id===selected);
  return <section className="sync-panel bank-import-workspace" aria-label="Importação bancária Pluggy">
    <div className="bank-import-heading"><div><p className="section-kicker">Integração bancária</p><h2>Bancos conectados</h2><p>Consulte, confira e importe movimentações com segurança. A consulta não altera seus lançamentos.</p></div><Landmark size={27} aria-hidden="true" /></div>
    <div className="bank-import-steps" aria-label="Etapas da importação">
      <span className={item?'is-done':''}>1. Banco</span><span className={selected?'is-done':''}>2. Conta</span><span className={review?'is-done':''}>3. Conferência</span><span>4. Importação</span>
    </div>
    <h3>Escolha o banco</h3>
    <div className="bank-import-banks">{banks.map(bank=><button key={bank.id} type="button" className={'bank-import-bank'+(item?.id===bank.id?' is-selected':'')} disabled={!!busy} aria-pressed={item?.id===bank.id} onClick={()=>chooseBank(bank)}><span className="bank-import-bank-mark">{bank.name==='Nubank'?'nu':'∞'}</span><span><strong>{bank.name}</strong><small>{item?.id===bank.id?'Conexão '+item.status:'Consultar conexão'}</small></span><ArrowRight size={17} aria-hidden="true"/></button>)}</div>
    {item?<div className="bank-import-section">
      <h3>Selecione uma conta bancária</h3>
      {accounts.length===0?<p>Nenhuma conta disponível nesta conexão.</p>:<div className="bank-import-account-list">{accounts.map(a=><button key={a.id} type="button" disabled={!a.id||!!busy} className={'bank-import-account'+(selected===a.id?' is-selected':'')} onClick={()=>a.id&&chooseAccount(a.id)}><span><strong>{a.name||a.type||'Conta bancária'}</strong><small>Ver movimentações e selecionar conta</small></span>{selected===a.id?<CheckCircle2 size={18}/>:<ArrowRight size={17}/>}</button>)}</div>}
    </div>:null}
    {selected?<div className="bank-import-section">
      <div className="bank-import-section-heading"><h3>Extrato consultado</h3><span>Prévia em leitura</span></div>
      <p>{transactions.length} movimentação(ões) recebida(s) na primeira página. A importação completa consultará todas as páginas necessárias para o período.</p>
      <div className="bank-import-preview-table"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>{transactions.slice(0,8).map((tx,i)=><tr key={tx.id??i}><td>{tx.date?.slice(0,10)||'—'}</td><td>{tx.description||'Sem descrição'}</td><td className={typeof tx.amount==='number'&&tx.amount<0?'bank-import-negative':''}>{typeof tx.amount==='number'?money(tx.amount):'—'}</td></tr>)}</tbody></table></div>
      {importTarget?<div className="bank-import-form">
        <h3>Preparar importação</h3>
        <p>Banco: <strong>{item?.name}</strong> · Origem: <strong>{selectedBankAccount?.name||'Conta selecionada'}</strong></p>
        <div className="bank-import-form-fields"><label>Conta de destino no Atlas<select aria-label="Conta de destino no Atlas" value={mapping} onChange={e=>{setMapping(e.target.value);invalidate();}}><option value="">Escolha a conta correspondente</option>{importTarget.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <label>Data inicial<input aria-label="Data inicial da importação bancária" type="date" value={fromDate} max={importTarget.context.today()} onChange={e=>{setFromDate(e.target.value);invalidate();}}/></label></div>
        <p className="bank-import-caution"><AlertTriangle size={17} aria-hidden="true"/> Confira se o período não está incluído no saldo inicial da conta. Transações lançadas manualmente podem ser duplicadas; IDs já importados do banco não.</p>
        <button type="button" className="button button--secondary" disabled={!!busy||!mapping||!fromDate} onClick={()=>void analyze()}><RefreshCw size={16} aria-hidden="true"/> Conferir importação completa</button>
        {busy==='review'?<p role="status"><LoaderCircle size={16} className="bank-import-loading"/> {progress||'Consultando extrato completo…'}</p>:null}
        {review?<div className="bank-import-review" role="region" aria-label="Conferência da importação">
          <h3><CheckCircle2 size={19} aria-hidden="true"/> Extrato conferido</h3>
          <div className="bank-import-summary"><div><strong>{review.preview.pages}</strong><span>Páginas verificadas</span></div><div><strong>{review.preview.received}</strong><span>Movimentações consultadas</span></div><div><strong>{review.preflight.newCount}</strong><span>Novas para importar</span></div></div>
          <p>Destino: <strong>{review.accountName}</strong> · Desde: <strong>{review.period}</strong>. Isso ainda não registrou movimentações.</p>
          <p className="bank-import-preflight">Das {review.preview.candidates.length} movimentações elegíveis: <strong>{review.preflight.newCount} novas</strong>, {review.preflight.existingInDestination} já importadas nesta conta e {review.preflight.existingInOtherAccount} já importadas em outra conta.</p>
          {review.preflight.existingInOtherAccount>0?<p role="alert" className="bank-import-caution"><AlertTriangle size={17} aria-hidden="true"/> Algumas movimentações já estão vinculadas a {review.preflight.otherAccountNames.join(', ')}. O Atlas não as duplicará nesta conta. Confira em Movimentações antes de qualquer ajuste.</p>:null}
          {review.preflight.newCount===0?<p role="status"><CheckCircle2 size={17} aria-hidden="true"/> Não há lançamentos novos neste extrato. Você pode conferir os registros já importados em Movimentações, na conta de destino e no período selecionado.</p>:null}
          <label className="bank-import-consent"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Conferi a conta, a data e o saldo inicial. Autorizo gravar essas movimentações na minha base.</label>
          <button type="button" className="button button--primary" disabled={!confirmed||!importTarget.canWrite||!!busy||review.preflight.newCount===0} onClick={()=>void commit()}>{busy==='commit'?'Gravando…':'Importar '+review.preflight.newCount+' nova(s) movimentação(ões)'}</button>
          {!importTarget.canWrite?<p role="alert">A nuvem não autorizou novas gravações nesta sessão; confira o acesso.</p>:null}
        </div>:null}
      </div>:<p>Este ambiente permite apenas consulta. A importação exige uma base financeira associada.</p>}
    </div>:null}
    {busy==='bank'||busy==='account'?<p role="status">Consultando banco e movimentações…</p>:null}
    {notice?<p role="status" className="bank-import-success"><CheckCircle2 size={18}/>{notice}</p>:null}
    {error?<div role="alert" className="bank-import-error"><AlertTriangle size={19} aria-hidden="true"/><div><strong>Não foi possível concluir a operação</strong><p>{error}</p><p>Falhas na consulta não geram lançamentos. Se a gravação começou, os lançamentos já salvos são preservados e não serão duplicados por ID bancário.</p></div></div>:null}
  </section>;
}
