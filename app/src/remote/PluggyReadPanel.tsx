import { useState } from 'react';
import type { RemoteController } from './controller';

/** Explicitly read-only bank connection inspector. No statements are posted. */
type BankRow = { id?:string; name?:string; status?:string; type?:string; itemId?:string; description?:string; amount?:number; date?:string };
const rows=(payload:unknown):BankRow[]=>{
  if(typeof payload!=='object'||payload===null)return [];
  const results=(payload as {results?:unknown}).results;
  if(!Array.isArray(results))return [];
  return results.filter((row):row is BankRow=>typeof row==='object'&&row!==null);
};
export function PluggyReadPanel({controller}:{controller:RemoteController}) {
  const [items,setItems]=useState<BankRow[]>([]);
  const [accounts,setAccounts]=useState<BankRow[]>([]);
  const [transactions,setTransactions]=useState<BankRow[]>([]);
  const [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function run(action:()=>Promise<void>){
    setBusy(true);setError('');
    try {await action();}catch {setError('Não foi possível consultar a Pluggy. Verifique a conexão e as credenciais de Preview.');}
    finally {setBusy(false);}
  }
  return <section className="sync-panel" aria-label="Importação bancária Pluggy">
    <h2>Conexões bancárias — Pluggy</h2>
    <p>Consulta somente para leitura. Nenhum lançamento será incluído no Atlas nesta etapa.</p>
    <button className="button button--secondary" disabled={busy} onClick={()=>void run(async()=>{setItems(rows(await controller.readBank('items')));setAccounts([]);setTransactions([]);})}>Consultar bancos conectados</button>
    {items.map(item=><div key={item.id}><span>{item.name||'Conexão'} · {item.status||'Status não informado'}</span>{item.id?<button className="text-button" disabled={busy} onClick={()=>void run(async()=>{setAccounts(rows(await controller.readBank('accounts',item.id)));setTransactions([]);})}>Ver contas</button>:null}</div>)}
    {accounts.map(account=><div key={account.id}><span>{account.name||account.type||'Conta bancária'}</span>{account.id?<button className="text-button" disabled={busy} onClick={()=>void run(async()=>{setTransactions(rows(await controller.readBank('transactions',account.id)));setSelected(account.id!);})}>Ver movimentações</button>:null}</div>)}
    {transactions.length>0?<div><h3>Movimentações consultadas</h3><p>Conta consultada: {selected}. Prévia, sem lançamento automático.</p><ul>{transactions.slice(0,20).map(tx=><li key={tx.id}>{tx.date||'Sem data'} · {tx.description||'Sem descrição'} · {typeof tx.amount==='number'?tx.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Valor indisponível'}</li>)}</ul></div>:null}
    {error?<p role="alert">{error}</p>:null}
  </section>;
}
