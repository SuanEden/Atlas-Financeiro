import { useEffect, useState } from 'react';
import { FinancialWorkspace } from '../App';
import { useLocalFinance } from '../ui/use-local-finance';
import { createSupabaseAdapter } from '../auth/supabase-adapter';
import { consumeAuthReturn } from '../auth/callback';

type BankAccount={id?:string;name?:string;type?:string;balance?:number;currencyCode?:string};
type BankItem={id?:string;name?:string;status?:string};
type BankTransaction={id?:string;date?:string;description?:string;amount?:number};
const BANKS=[
  {name:'Nubank',itemId:'71c06153-0d24-45ac-81f6-9de6f0d04282'},
  {name:'Infinite',itemId:'1c91ee97-e614-494f-b41a-5e203d5fa7ee'},
] as const;
function records<T>(body:unknown):T[]{
  if(!body||typeof body!=='object')return [];
  const results=(body as {results?:unknown}).results;
  return Array.isArray(results)?results as T[]:[];
}

export default function LocalBankWorkspace(){
  const finance=useLocalFinance();
  const [adapter]=useState(()=>{
    const url=import.meta.env.VITE_SUPABASE_URL;
    const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if(typeof url!=='string'||typeof key!=='string'||!url||!key)return undefined;
    return createSupabaseAdapter({url,publishableKey:key,serverId:new URL(url).hostname},location.origin);
  });
  const [session,setSession]=useState<'checking'|'connected'|'disconnected'|'unavailable'>('checking');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const [bankName,setBankName]=useState('');
  const [accounts,setAccounts]=useState<BankAccount[]>([]);
  const [transactions,setTransactions]=useState<BankTransaction[]>([]);
  const [selected,setSelected]=useState('');
  useEffect(()=>{
    let live=true;
    const result=consumeAuthReturn(location.href,(path)=>history.replaceState(null,'',path));
    void (async()=>{
      if(!adapter){if(live)setSession('unavailable');return;}
      try{
        if(result.kind==='error')throw new Error('O provedor recusou o retorno.');
        if(result.kind==='code')await adapter.auth.callback(result.code);
        const ok=await adapter.auth.verifyBankLogin?.();
        if(live)setSession(ok?'connected':'disconnected');
      }catch{
        if(live){setSession('disconnected');setMessage('Não foi possível concluir a autenticação bancária.');}
      }
    })();
    return()=>{live=false;};
  },[adapter]);

  async function consult(name:string,itemId:string){
    if(!adapter)return;
    setBusy(true);setMessage('Consultando '+name+'…');setAccounts([]);setTransactions([]);setBankName(name);
    try{
      // Bank access is authenticated server-side; no I3 financial association is required.
      const info=await adapter.auth.readBank?.('item',itemId) as BankItem|undefined;
      if(!info||typeof info!=='object'||(!info.id&&!info.status))throw new Error('Resposta da conexão inválida.');
      const body=await adapter.auth.readBank?.('accounts',itemId);
      setAccounts(records<BankAccount>(body));
      setMessage(records<BankAccount>(body).length?'Contas consultadas em modo leitura.':'Conexão encontrada, mas nenhuma conta foi retornada.');
    }catch(e){
      setMessage('Não foi possível consultar '+name+': '+(e instanceof Error?e.message:'erro inesperado')+'.');
    }finally{setBusy(false);}
  }
  async function movement(accountId:string){
    if(!adapter)return;
    setBusy(true);setSelected(accountId);setMessage('Consultando movimentações…');
    try{
      const response=await adapter.auth.readBank?.('transactions',accountId);
      setTransactions(records<BankTransaction>(response));
      setMessage('Consulta concluída em modo leitura; nenhum lançamento foi alterado.');
    }catch(e){setMessage('Movimentações indisponíveis: '+(e instanceof Error?e.message:'erro inesperado'));}
    finally{setBusy(false);}
  }
  const panel=<section className="sync-panel" aria-label="Bancos">
    <h2>Bancos</h2>
    <p>Conexões pessoais somente para leitura. Seus registros do Atlas continuam salvos neste dispositivo.</p>
    {session==='checking'?<p role="status">Verificando a sessão bancária…</p>:null}
    {session==='unavailable'?<p role="alert">A autenticação bancária não está configurada nesta publicação.</p>:null}
    {session==='disconnected'&&adapter?<button className="button button--primary" onClick={()=>void adapter.auth.login().catch(()=>setMessage('Falha ao abrir autenticação Google.'))}>Conectar conta Google</button>:null}
    {session==='connected'&&adapter?<div>
      <p>Conta Google conectada para consulta bancária.</p>
      {BANKS.map(b=><button key={b.itemId} className="button button--secondary" disabled={busy} onClick={()=>void consult(b.name,b.itemId)}>Consultar {b.name}</button>)}
      <button className="text-button" disabled={busy} onClick={()=>void adapter.auth.logout().then(()=>{setSession('disconnected');setAccounts([]);setTransactions([]);}).catch(()=>setMessage('Não foi possível encerrar a sessão bancária.'))}>Desconectar Google</button>
    </div>:null}
    {message?<p role="status">{message}</p>:null}
    {accounts.length>0?<section><h3>Contas de {bankName}</h3>{accounts.map(a=><div key={a.id}><strong>{a.name||a.type||'Conta'}</strong>{a.id?<button className="text-button" disabled={busy} onClick={()=>void movement(a.id!)}>Ver movimentações</button>:null}</div>)}</section>:null}
    {transactions.length>0?<section><h3>Movimentações da conta {selected}</h3><ul>{transactions.slice(0,30).map((tx,i)=><li key={tx.id||i}>{tx.date||'Sem data'} · {tx.description||'Sem descrição'} · {typeof tx.amount==='number'?tx.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Sem valor'}</li>)}</ul></section>:null}
  </section>;
  return <FinancialWorkspace finance={finance} bankPanel={panel}/>;
}
