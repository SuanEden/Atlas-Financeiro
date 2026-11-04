import { useState } from 'react';
import type { CommandContext, LocalCommand } from '../application';
import type { LocalFinancialState } from '../domain';
import { syncLinkedBankAccount } from './bank-auto-import';

type BankReader = { readBank(resource:'item'|'accounts'|'transactions',id?:string,after?:string,dateFrom?:string):Promise<unknown> };
export type CloudBankImport = {
  accounts: LocalFinancialState['accounts'];
  readState: () => Promise<LocalFinancialState>;
  execute: (command: LocalCommand) => Promise<void>;
  context: CommandContext;
  canWrite: boolean;
};
type BankRow = { id?:string; name?:string; status?:string; type?:string; itemId?:string; description?:string; amount?:number; date?:string; currencyCode?:string };
const rows=(payload:unknown):BankRow[]=>{
  if(typeof payload!=='object'||payload===null)return [];
  const results=(payload as {results?:unknown}).results;
  if(!Array.isArray(results))return [];
  return results.filter((row):row is BankRow=>typeof row==='object'&&row!==null);
};
const previousDay=(date:string):string=>{
  const day=new Date(date+'T12:00:00.000Z');
  if(Number.isNaN(day.getTime())||day.toISOString().slice(0,10)!==date)throw new Error('Data inicial inválida.');
  day.setUTCDate(day.getUTCDate()-1);
  return day.toISOString().slice(0,10);
};
const banks=[
  {name:'Nubank',id:'71c06153-0d24-45ac-81f6-9de6f0d04282'},
  {name:'Infinite',id:'1c91ee97-e614-494f-b41a-5e203d5fa7ee'},
] as const;
export function PluggyReadPanel({controller,importTarget}:{controller:BankReader;importTarget?:CloudBankImport}) {
  const [items,setItems]=useState<BankRow[]>([]);
  const [accounts,setAccounts]=useState<BankRow[]>([]);
  const [transactions,setTransactions]=useState<BankRow[]>([]);
  const [selected,setSelected]=useState('');
  const [selectedItem,setSelectedItem]=useState('');
  const [mapping,setMapping]=useState('');
  const [fromDate,setFromDate]=useState(()=>importTarget?.context.today()??new Date().toISOString().slice(0,10));
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  async function run(action:()=>Promise<void>){
    setBusy(true);setError('');setNotice('');
    try {await action();}
    catch (reason) {
      const message=reason instanceof Error?reason.message:'';
      const status=/HTTP (\d{3})/.exec(message)?.[1];
      setError(status ? 'Consulta/importação bancária falhou (HTTP '+status+'). Nenhum lançamento adicional foi enviado após esse erro.' : message || 'Operação bancária indisponível. Verifique o acesso e tente novamente.');
    } finally {setBusy(false);}
  }
  async function importSelected(){
    if(!importTarget||!selected||!selectedItem||!mapping||!confirmed||!importTarget.canWrite) return;
    await run(async()=>{
      if(!importTarget.accounts.some(account=>account.id===mapping))throw new Error('Selecione uma conta válida do Atlas.');
      if(fromDate>importTarget.context.today())throw new Error('A data inicial não pode estar no futuro.');
      const linked={
        itemId:selectedItem, pluggyAccountId:selected, atlasAccountId:mapping,
        activatedOn:previousDay(fromDate),
      };
      const count=await syncLinkedBankAccount(linked,{
        readPage:(accountId,after,dateFrom)=>controller.readBank('transactions',accountId,after,dateFrom),
        readState:importTarget.readState,execute:importTarget.execute,context:importTarget.context,
      });
      setNotice(count>0
        ? count+' movimentação(ões) adicionada(s) ao Atlas. A sincronização com a nuvem seguirá o status do painel.'
        : 'Nenhuma movimentação nova e confirmada para o período. Operações pendentes, anteriores à data e IDs já importados não são lançados.');
      setConfirmed(false);
    });
  }
  return <section className="sync-panel" aria-label="Importação bancária Pluggy">
    <h2>Conexões bancárias — Pluggy</h2>
    <p>{importTarget?'Consulte movimentações e importe lançamentos confirmados para uma conta do Atlas, com sua autorização.':'Consulta bancária para leitura. Para importar no modo nuvem, entre na sua base associada.'}</p>
    <p>Escolha seu banco. Os identificadores das conexões já estão configurados.</p>
    {banks.map(bank=><button key={bank.id} type="button" className="button button--secondary" disabled={busy} onClick={()=>void run(async()=>{
      const result=await controller.readBank('item',bank.id) as BankRow;
      const item:BankRow={...result,id:result.id||bank.id,name:result.name||bank.name};
      setItems(current=>[...current.filter(x=>x.id!==bank.id),item]);
      setAccounts(rows(await controller.readBank('accounts',bank.id)));
      setTransactions([]);setSelected('');setSelectedItem(bank.id);setMapping('');setConfirmed(false);
    })}>Consultar {bank.name}</button>)}
    {items.map(item=><div key={item.id}><span>{item.name||'Conexão'} · {item.status||'Status não informado'}</span>{item.id?<button type="button" className="text-button" disabled={busy} onClick={()=>void run(async()=>{setAccounts(rows(await controller.readBank('accounts',item.id)));setTransactions([]);setSelected('');setSelectedItem(item.id!);setConfirmed(false);})}>Ver contas</button>:null}</div>)}
    {accounts.map(account=><div key={account.id}><span>{account.name||account.type||'Conta bancária'}</span>{account.id?<button type="button" className="text-button" disabled={busy} onClick={()=>void run(async()=>{setTransactions(rows(await controller.readBank('transactions',account.id)));setSelected(account.id!);setMapping('');setConfirmed(false);})}>Ver movimentações</button>:null}</div>)}
    {selected?<div>
      <h3>Movimentações consultadas</h3>
      <p>{transactions.length} movimentação(ões) recebida(s) na primeira página do extrato. Esta prévia não altera seus dados.</p>
      {transactions.length>0?<ul>{transactions.slice(0,20).map((tx,i)=><li key={tx.id??i}>{tx.date||'Sem data'} · {tx.description||'Sem descrição'} · {typeof tx.amount==='number'?tx.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Valor indisponível'}</li>)}</ul>:<p>Nenhuma movimentação retornada nesta consulta.</p>}
      {importTarget?<div className="bank-import-confirm">
        <h4>Enviar movimentações ao Atlas</h4>
        <label>Conta de destino no Atlas
          <select aria-label="Conta de destino no Atlas" value={mapping} onChange={event=>{setMapping(event.target.value);setConfirmed(false);}}><option value="">Selecione uma conta já cadastrada</option>{importTarget.accounts.map(account=><option key={account.id} value={account.id}>{account.name}</option>)}</select>
        </label>
        <label>Importar movimentações a partir de
          <input aria-label="Data inicial da importação bancária" type="date" value={fromDate} max={importTarget.context.today()} onChange={event=>{setFromDate(event.target.value);setConfirmed(false);}} />
        </label>
        <p className="warning-copy">Importação manual de transações POSTED na data escolhida ou depois. O Atlas evita repetir o mesmo ID bancário, mas não consegue identificar automaticamente cópias feitas manualmente. Confira o saldo inicial e não importe períodos já contemplados nele. Movimentações anteriores à data selecionada não serão lançadas.</p>
        <label><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} /> Conferi a conta de destino, o período e o risco de duplicar lançamentos manuais.</label>
        <button type="button" className="button button--primary" disabled={busy||!importTarget.canWrite||!mapping||!confirmed||!fromDate} onClick={()=>void importSelected()}>{busy?'Importando…':'Importar para o Atlas'}</button>
        {!importTarget.canWrite?<p role="alert">A gravação na nuvem não está liberada para esta sessão. Entre novamente ou confira o status da sincronização antes de importar.</p>:null}
      </div>:null}
    </div>:null}
    {notice?<p role="status">{notice}</p>:null}
    {error?<p role="alert">{error}</p>:null}
  </section>;
}
