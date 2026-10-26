import { useState } from 'react';
import { RemoteApp } from './RemoteApp';
import { RemoteController } from './controller';
import { createSupabaseAdapter, readRemoteConfig } from '../auth/supabase-adapter';
import { consumeAuthReturn } from '../auth/callback';
import { getOrCreateLocalOwnerId } from '../application';
import { createLocalFinancialStore } from '../persistence';

let runtime:RemoteController|undefined;
function createRuntime() {
  const authReturn=consumeAuthReturn(location.href,(path)=>history.replaceState(null,'',path));
  const config=readRemoteConfig(import.meta.env);
  if(!config)throw new Error('Modo de integração indisponível.');
  const adapter=createSupabaseAdapter(config,location.origin);
  const controller=new RemoteController(config.serverId,adapter.auth,adapter.transport,localStorage,{
    async read() {
      const ownerId=getOrCreateLocalOwnerId();const store=createLocalFinancialStore(ownerId);
      try {return {ownerId,state:await store.readLocalState()};}finally {store.close();}
    },
  });
  void controller.start(authReturn);
  return controller;
}
export default function RemoteBootstrap() {
  const [result]=useState(()=>{
    try {runtime??=createRuntime();return {controller:runtime};}catch{return {controller:undefined};}
  });
  if(!result.controller)return <main className="access-page"><h1>Atlas Financeiro</h1><p role="alert">A configuração de integração não pôde ser validada. O acesso aos dados permanece bloqueado. Confira o ambiente aprovado.</p></main>;
  return <RemoteApp controller={result.controller} />;
}
