import { useEffect, useState } from 'react';
import { FinancialWorkspace } from '../App';
import { useLocalFinance } from '../ui/use-local-finance';
import { createSupabaseAdapter } from '../auth/supabase-adapter';
import { consumeAuthReturn } from '../auth/callback';
import { PluggyReadPanel } from './PluggyReadPanel';

const url=import.meta.env.VITE_SUPABASE_URL;
const publishableKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function LocalBankWorkspace() {
  const finance=useLocalFinance();
  const [bank]=useState(()=>{
    if(!url||!publishableKey)return undefined;
    return createSupabaseAdapter({url,publishableKey,serverId:new URL(url).hostname},location.origin);
  });
  const [verified,setVerified]=useState(false);
  const [working,setWorking]=useState(true);
  const [error,setError]=useState('');
  const [diagnostic,setDiagnostic]=useState('');
  async function checkPluggy(){
    setDiagnostic('Verificando a API…');
    try {
      const response=await fetch('/api/pluggy?resource=health',{cache:'no-store',headers:{Accept:'application/json'}});
      const body=await response.json() as {authentication?:string};
      setDiagnostic(response.ok&&body.authentication==='ok'?'Pluggy: autenticação do servidor aprovada.':`Pluggy: falha na API (HTTP ${response.status}; ${body.authentication||'resposta inesperada'}).`);
    } catch {setDiagnostic('A rota da API não respondeu em JSON. Verifique o roteamento do servidor.');}
  }
  useEffect(()=>{
    let live=true;
    const callback=consumeAuthReturn(location.href,(path)=>history.replaceState(null,'',path));
    async function restore(){
      if(!bank){if(live)setWorking(false);return;}
      try {
        if(callback.kind==='error')throw new Error('O Google não confirmou o retorno.');
        if(callback.kind==='code')await bank.auth.callback(callback.code);
        const authorized=await bank.auth.verifyBankLogin?.();
        if(live)setVerified(Boolean(authorized));
      }catch{if(live)setVerified(false);}
      finally{if(live)setWorking(false);}
    }
    void restore();
    return ()=>{live=false;};
  },[bank]);
  const panel=working?<p>Conferindo conexão bancária…</p>:
    !bank?<p>Conexão bancária não configurada no servidor.</p>:
    !verified?<div><p>A consulta bancária exige sua conta Google. Seus dados financeiros locais permanecem acessíveis.</p>
      <button className="button button--primary" onClick={()=>void bank.auth.login().catch(()=>setError('Não foi possível iniciar o Google.'))}>Conectar Google para bancos</button>{error?<p role="alert">{error}</p>:null}</div>:
    <div><button className="button button--secondary" onClick={()=>void bank.auth.logout().then(()=>setVerified(false)).catch(()=>setError('Não foi possível sair da consulta bancária.'))}>Desconectar bancos</button>
      <PluggyReadPanel controller={{readBank:async (resource,id)=>bank.auth.readBank!(resource,id)}} />{error?<p role="alert">{error}</p>:null}</div>;
  return <FinancialWorkspace finance={finance} bankPanel={<section><button className="button button--secondary" onClick={()=>void checkPluggy()}>Diagnosticar conexão Pluggy (sem Google)</button>{diagnostic?<p role="status">{diagnostic}</p>:null}{panel}</section>}/>;
}

export default LocalBankWorkspace;
