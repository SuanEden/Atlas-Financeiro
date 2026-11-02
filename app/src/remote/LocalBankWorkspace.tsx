import { useEffect, useState } from 'react';
import { FinancialWorkspace } from '../App';
import { useLocalFinance } from '../ui/use-local-finance';
import { createSupabaseAdapter } from '../auth/supabase-adapter';
import { consumeAuthReturn } from '../auth/callback';
import { createAccountCommand } from '../application';
import { syncLinkedBankAccount, type BankLink } from './bank-auto-import';

type BankAccount={id?:string;name?:string;type?:string;balance?:number;currencyCode?:string};
type BankSnapshot={accounts:BankAccount[];lastUpdated:string;bankUpdatedAt?:string;status?:string;error?:string};
const money=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
const bankAccounts=(list:BankAccount[])=>list.filter(a=>(!a.type||a.type==='BANK')&&(!a.currencyCode||a.currencyCode==='BRL'));
const balanceText=(list:BankAccount[])=>{const known=bankAccounts(list).filter(a=>typeof a.balance==='number'&&Number.isFinite(a.balance));return known.length?money(known.reduce((sum,a)=>sum+a.balance!,0)):'Saldo indisponível';};
type BankItem={id?:string;name?:string;status?:string;lastUpdatedAt?:string};
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
  const [snapshots,setSnapshots]=useState<Record<string,BankSnapshot>>({});
  const [refreshing,setRefreshing]=useState(false);
  const [links,setLinks]=useState<Record<string,BankLink>>(()=>{
    try { const saved=JSON.parse(localStorage.getItem('atlas:pluggy-mappings:v1:'+finance.userId)||'{}');return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{}; }catch{return {};}
  });
  const [mappingTarget,setMappingTarget]=useState<Record<string,string>>({});
  const [importing,setImporting]=useState(false);
  async function connectBank(){
    if(!adapter){setMessage('Integração bancária não configurada.');return;}
    if(location.hostname!=='atlas-financeiro-nine.vercel.app'){
      setMessage('Para autorizar seus bancos, abra primeiro atlas-financeiro-nine.vercel.app.');
      return;
    }
    try{setMessage('Abrindo autorização segura do Google…');await adapter.auth.login();}
    catch{setMessage('Falha ao abrir o Google. Verifique o endereço de retorno autorizado no Supabase.');}
  }
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

  async function refreshBank(name:string,itemId:string,visible=false){
    if(!adapter)return;
    if(visible){setBusy(true);setMessage('Consultando '+name+'…');setAccounts([]);setTransactions([]);setBankName(name);}
    try{
      const info=await adapter.auth.readBank?.('item',itemId) as BankItem|undefined;
      if(!info||typeof info!=='object'||(!info.id&&!info.status))throw new Error('Conexão bancária não disponível.');
      if(info.status==='LOGIN_ERROR')throw new Error('O banco exige nova autorização na Pluggy.');
      if(info.status==='OUTDATED')throw new Error('A última sincronização bancária falhou; aguarde a Pluggy atualizar.');
      const response=await adapter.auth.readBank?.('accounts',itemId);
      const next=bankAccounts(records<BankAccount>(response));
      setSnapshots(current=>({...current,[itemId]:{accounts:next,lastUpdated:new Date().toISOString(),...(info.lastUpdatedAt?{bankUpdatedAt:info.lastUpdatedAt}:{}),...(info.status?{status:info.status}:{})}}));
      if(visible){setAccounts(next);setMessage(next.length?'Saldo e contas consultados.':'A Pluggy não retornou contas para este banco.');}
    }catch(e){
      const description=e instanceof Error?e.message:'Erro de conexão';
      setSnapshots(current=>({...current,[itemId]:{...current[itemId],accounts:current[itemId]?.accounts||[],lastUpdated:current[itemId]?.lastUpdated||'',error:description}}));
      if(visible)setMessage('Não foi possível consultar '+name+': '+description);
    }finally{if(visible)setBusy(false);}
  }
  async function consult(name:string,itemId:string){await refreshBank(name,itemId,true);}
  useEffect(()=>{
    if(session!=='connected'||!adapter)return;
    let alive=true;
    const refresh=async()=>{
      if(!alive||document.visibilityState==='hidden')return;
      setRefreshing(true);
      try{await Promise.all(BANKS.map(b=>refreshBank(b.name,b.itemId)));}finally{if(alive)setRefreshing(false);}
    };
    void refresh();
    const timer=window.setInterval(()=>{void refresh();},5*60*1000);
    const onVisible=()=>{if(document.visibilityState==='visible')void refresh();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{alive=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[session,adapter]);
  async function activateImport(bankAccount:BankAccount,itemId:string){
    if(!bankAccount.id||busy||importing)return;
    const choice=mappingTarget[bankAccount.id];
    if(!choice){setMessage('Selecione uma conta do Atlas ou escolha criar uma nova.');return;}
    setBusy(true);
    try{
      let atlasAccountId=choice;
      if(choice==='__new'){
        if(typeof bankAccount.balance!=='number'||!Number.isFinite(bankAccount.balance))throw new Error('Saldo inicial bancário ainda indisponível.');
        const initialCents=Math.round(bankAccount.balance*100);
        if(!Number.isSafeInteger(initialCents))throw new Error('Saldo fora do limite para importação.');
        const command=createAccountCommand({
          name:bankName+' · '+(bankAccount.name||'Conta bancária'),
          kind:'digital',availability:'free',openingDate:finance.context.today(),
          openingBalanceCents:BigInt(initialCents),
          openingBalanceSource:'Pluggy · saldo confirmado na ativação',
          openingBalanceCertainty:'confirmed',
        },finance.context);
        atlasAccountId=command.aggregate.accounts?.[0]?.id||'';
        if(!atlasAccountId)throw new Error('Identificador de conta não gerado.');
        await finance.execute(command);
      }else if(!finance.state.accounts.some(a=>a.id===choice))throw new Error('Conta do Atlas selecionada não existe.');
      const next={...links,[bankAccount.id]:{itemId,pluggyAccountId:bankAccount.id,atlasAccountId,activatedOn:finance.context.today()}};
      localStorage.setItem('atlas:pluggy-mappings:v1:'+finance.userId,JSON.stringify(next));
      setLinks(next);
      setMessage('Importação vinculada. Serão registrados automaticamente apenas lançamentos confirmados dos próximos dias, sem repetir IDs já importados.');
    }catch(e){setMessage('Não foi possível vincular a conta: '+(e instanceof Error?e.message:'erro inesperado'));}
    finally{setBusy(false);}
  }
  function stopImport(accountId:string){
    const next={...links};delete next[accountId];
    localStorage.setItem('atlas:pluggy-mappings:v1:'+finance.userId,JSON.stringify(next));
    setLinks(next);setMessage('Importação futura desativada. O histórico já registrado foi preservado.');
  }
  useEffect(()=>{
    if(session!=='connected'||!adapter||Object.keys(links).length===0)return;
    let alive=true;
    const sync=async()=>{
      if(!alive||document.visibilityState==='hidden')return;
      setImporting(true);
      let imported=0;let firstError='';
      for(const link of Object.values(links)){
        try{
          imported+=await syncLinkedBankAccount(link,{
            readPage:(accountId,after)=>adapter.auth.readBank!('transactions',accountId,after),
            readState:finance.readState,execute:finance.execute,context:finance.context,
          });
        }catch(e){firstError=e instanceof Error?e.message:'erro não identificado';break;}
      }
      if(alive){
        if(firstError)setMessage('Importação automática interrompida: '+firstError);
        else if(imported>0)setMessage(imported+' nova(s) movimentação(ões) importada(s) para o Atlas.');
        setImporting(false);
      }
    };
    void sync();
    const timer=window.setInterval(()=>void sync(),6*60*60*1000);
    return()=>{alive=false;window.clearInterval(timer);};
  },[session,adapter,links]);
  async function realTimeBalance(accountId:string){
    if(!adapter)return;
    setBusy(true);setMessage('Solicitando saldo em tempo real…');
    try{
      const response=await adapter.auth.readBank?.('balance',accountId) as {balance?:number;currencyCode?:string;updateDateTime?:string}|undefined;
      if(!response||typeof response.balance!=='number'||!Number.isFinite(response.balance)||response.currencyCode!=='BRL')throw new Error('A Pluggy não confirmou um saldo válido em reais.');
      const balance=response.balance;
      setAccounts(existing=>existing.map(a=>a.id===accountId?{...a,balance}:a));
      setSnapshots(existing=>Object.fromEntries(Object.entries(existing).map(([id,s])=>[id,{...s,accounts:s.accounts.map(a=>a.id===accountId?{...a,balance}:a),...(response.updateDateTime?{bankUpdatedAt:response.updateDateTime}:{})}])));
      setMessage('Saldo atualizado pela instituição.');
    }catch(e){setMessage('Saldo em tempo real indisponível: '+(e instanceof Error?e.message:'erro não identificado'));}
    finally{setBusy(false);}
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
    <h2>Meus bancos</h2>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,margin:'18px 0 24px'}}>
      {BANKS.map(b=><button key={b.itemId} type="button" disabled={busy} className="button button--secondary" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,minHeight:132,borderRadius:16}}
        onClick={()=>{if(session==='connected')void consult(b.name,b.itemId);else if(session==='disconnected')void connectBank();else setMessage('Aguarde a verificação da conexão bancária.');}}>
        <span aria-hidden="true" style={{width:58,height:58,display:'grid',placeItems:'center',borderRadius:16,background:b.name==='Nubank'?'#820ad1':'#1b2434',color:'#fff',fontSize:30,fontWeight:700}}>{b.name==='Nubank'?'nu':'∞'}</span>
        <strong>{b.name}</strong>
        {session==='connected' && snapshots[b.itemId]?.lastUpdated ? <span style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
          <strong>{balanceText(snapshots[b.itemId]!.accounts)}</strong>
          {snapshots[b.itemId]!.bankUpdatedAt && !Number.isNaN(Date.parse(snapshots[b.itemId]!.bankUpdatedAt!))?<small>Saldo bancário de {new Date(snapshots[b.itemId]!.bankUpdatedAt!).toLocaleString('pt-BR')}</small>:<small>Última atualização bancária não informada</small>}
        </span>:null}
        {session==='connected' && snapshots[b.itemId]?.error ? <small>{snapshots[b.itemId]!.error}</small>:null}
      </button>)}
    </div>
    {importing?<p role="status">Sincronizando movimentações autorizadas…</p>:null}
    {session==='connected'?<p role="status">{refreshing?'Atualizando saldos…':'Saldos consultados automaticamente ao abrir, retornar à aba e a cada 5 minutos enquanto o Atlas estiver aberto.'}</p>:null}
    {session==='disconnected'?<p>Toque em Nubank ou Infinite para autorizar a consulta pelo Google. Nenhuma senha bancária é solicitada pelo Atlas.</p>:null}
    {session==='unavailable'?<p role="alert">Serviço de autenticação bancária indisponível nesta publicação.</p>:null}
    {message?<p role="status">{message}</p>:null}
    {accounts.length>0?<section><h3>Contas de {bankName}</h3>{accounts.map(a=><div key={a.id} style={{padding:'12px 0'}}>
      <strong>{a.name||a.type||'Conta'} — {a.currencyCode==='BRL'&&typeof a.balance==='number'?money(a.balance):'Saldo indisponível'}</strong>
      {a.id?<button className="text-button" disabled={busy} onClick={()=>void realTimeBalance(a.id!)}>Saldo em tempo real</button>:null}
      {a.id?<button className="text-button" disabled={busy} onClick={()=>void movement(a.id!)}>Ver movimentações</button>:null}
      {a.id&&links[a.id]?<p>Importação futura ativa desde {links[a.id]!.activatedOn}. <button className="text-button" disabled={busy||importing} onClick={()=>stopImport(a.id!)}>Parar importação</button></p>:null}
      {a.id&&!links[a.id]?<div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
        <select aria-label={'Conta do Atlas para '+(a.name||'banco')} value={mappingTarget[a.id]||''} onChange={event=>setMappingTarget(current=>({...current,[a.id!]:event.target.value}))}>
          <option value="">Selecione uma conta do Atlas</option>
          <option value="__new">Criar uma conta com saldo inicial</option>
          {finance.state.accounts.map(local=><option key={local.id} value={local.id}>{local.name}</option>)}
        </select>
        <button className="button button--secondary" disabled={busy||importing} onClick={()=>void activateImport(a, BANKS.find(b=>b.name===bankName)?.itemId||'')}>Ativar importação automática</button>
      </div>:null}
    </div>)}</section>:null}
    {transactions.length>0?<section><h3>Movimentações da conta {selected}</h3><ul>{transactions.slice(0,30).map((tx,i)=><li key={tx.id||i}>{tx.date||'Sem data'} · {tx.description||'Sem descrição'} · {typeof tx.amount==='number'?tx.amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Sem valor'}</li>)}</ul></section>:null}
  </section>;
  return <FinancialWorkspace finance={finance} bankPanel={panel}/>;
}
