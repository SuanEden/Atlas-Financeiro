import { useEffect, useState, useSyncExternalStore } from 'react';
import { FinancialWorkspace } from '../App';
import { useRemoteFinance } from '../ui/use-remote-finance';
import type { RemoteController } from './controller';
import { exportSyncBackup } from '../sync/export-backup';
import { formatBRL } from '../domain';
import type { PendingDelivery } from '../sync/local-sync-store';

export function RemoteApp({controller}:{controller:RemoteController}) {
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  useEffect(()=>{
    const timer=setInterval(()=>controller.expireIfNeeded(),1000);
    const storage=(event:StorageEvent)=>{if(event.key===controller.policy.storageKey||event.key===null)controller.storageChanged();};
    window.addEventListener('storage',storage);
    return ()=>{clearInterval(timer);window.removeEventListener('storage',storage);};
  },[controller]);
  if(snapshot.loading)return <main className="access-page"><h1>Atlas Financeiro</h1><p role="status">Conferindo acesso…</p></main>;
  if(!snapshot.session.canView)return <AccessGate key={snapshot.session.userId} controller={controller} />;
  return <RemoteWorkspace key={snapshot.session.userId} controller={controller} />;
}

function AccessGate({controller}:{controller:RemoteController}) {
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  const [preview,setPreview]=useState<Awaited<ReturnType<RemoteController['previewLocalSource']>>>();
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [failure,setFailure]=useState('');
  const [dark]=useState(()=>localStorage.getItem('atlas-financeiro:theme:v1')==='dark');
  const canAssociate=snapshot.session.onlineVerified&&snapshot.session.canTransmit;
  async function run(action:()=>Promise<unknown>) {
    setBusy(true);setFailure('');
    try {await action();}catch{setFailure('Não foi possível concluir. Os dados e a origem foram preservados. Confira a sessão e tente novamente.');}
    finally {setBusy(false);}
  }
  return <main className="app-shell access-page" data-theme={dark?'dark':'light'}><section className="access-card">
    <span className="brand-mark" aria-hidden="true">A</span><h1>Atlas Financeiro</h1>
    <p role="status">{snapshot.session.message}</p><p>{snapshot.notice}</p>
    {failure?<p role="alert">{failure}</p>:null}
    <button className="button button--primary" disabled={busy} onClick={()=>void controller.login()}>Entrar com Google</button>
    {snapshot.session.onlineVerified?<button className="button button--ghost" disabled={busy} onClick={()=>void controller.logout()}>Sair e bloquear acesso local</button>:null}
    {canAssociate?<section className="association-panel" aria-label="Associação inicial">
      <h2>Escolha como começar neste navegador</h2><p>Confirme a conta Google antes de continuar. Dados de teste não devem ser usados como sua base pessoal.</p>
      <label><input type="checkbox" checked={confirmed} onChange={(event)=>setConfirmed(event.target.checked)} />Conferi a conta e autorizo somente a opção que escolher abaixo.</label>
      <button className="button button--secondary" disabled={busy||!confirmed} onClick={()=>void run(()=>controller.associateEmpty())}>Iniciar uma base vazia</button>
      <button className="button button--secondary" disabled={busy||!confirmed} onClick={()=>void run(()=>controller.joinExisting())}>Receber minha base já associada</button>
      <button className="text-button" disabled={busy} onClick={()=>void run(async()=>{setPreview(await controller.previewLocalSource());})}>Conferir base local I2 para associação</button>
      {preview?<div><p>{preview.accounts} contas, {preview.events} lançamentos e {preview.pending} operações locais. A origem será preservada. Feche abas antigas de I2 antes de copiar.</p><button className="button button--secondary" disabled={busy||!confirmed} onClick={()=>void run(()=>controller.associateLocal(preview.digest))}>Confirmar cópia da base conferida</button></div>:null}
      <button className="text-button" disabled={busy||snapshot.syncing} onClick={()=>void run(()=>controller.sync())}>Retomar associação pendente</button>
    </section>:null}
    <p className="warning-copy">Sair bloqueia a visualização neste perfil sem apagar pendências. Esta proteção local não é criptografia. O envio exige sessão verificada e liberação do servidor.</p>
  </section></main>;
}

function RemoteWorkspace({controller}:{controller:RemoteController}) {
  const finance=useRemoteFinance(controller);
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  async function exportJson() {
    const current=controller.getSnapshot();const store=current.store;
    if(!current.session.canView||!store)throw new Error('Entre novamente antes de exportar.');
    const json=await exportSyncBackup(store,controller.serverId);
    if(!controller.getSnapshot().session.canView||controller.getSnapshot().session.userId!==store.userId)throw new Error('A sessão mudou.');
    return json;
  }
  return <FinancialWorkspace finance={finance} integration exportJson={exportJson} sessionControls={<section className="sync-panel" aria-label="Sincronização">
    <div><strong>{snapshot.session.onlineVerified?'Acesso verificado':'Acesso offline'}</strong><p role="status">{snapshot.notice||snapshot.session.message}</p></div>
    <div className="sync-actions"><button className="button button--secondary" disabled={!snapshot.session.canTransmit||snapshot.syncing} onClick={()=>void controller.sync()}>{snapshot.syncing?'Conferindo envio…':'Sincronizar agora'}</button>
      {!snapshot.session.onlineVerified?<button className="text-button" onClick={()=>void controller.login()}>Entrar novamente</button>:null}
      <button className="text-button" onClick={()=>void controller.logout()}>Sair e bloquear</button></div>
    <Conflicts controller={controller} />
  </section>} />;
}

function Conflicts({controller}:{controller:RemoteController}) {
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  const [pending,setPending]=useState<PendingDelivery[]>([]);
  const [failure,setFailure]=useState('');
  useEffect(()=>{
    let active=true;
    snapshot.store?.read().then((state)=>{if(active)setPending(state.pending.filter((row)=>row.status==='conflict'||row.status==='blocked'));}).catch(()=>{if(active)setFailure('Não foi possível conferir os conflitos. Tente sincronizar novamente.');});
    return ()=>{active=false;};
  },[snapshot.store,snapshot.dataRevision]);
  if(!pending.length&&!failure)return null;
  return <div className="sync-conflicts"><h2>Alterações para conferir</h2><p>Um conflito fica fora dos saldos. Aceitar o estado recebido preserva a tentativa original na cópia I3; um novo lançamento exige outra decisão.</p>
    {failure?<p role="alert">{failure}</p>:null}
    {pending.map((row)=><details key={row.id}><summary>{row.status==='blocked'?'Alteração aguardando dependência':'Conflito preservado'} · {row.envelope.kind}</summary>
      <p>Operação: {row.id}</p><ConflictDetails delivery={row} />
      {row.status==='conflict'?<button className="text-button" onClick={()=>{
        if(window.confirm('Aceitar o estado recebido e manter esta tentativa apenas no histórico de conflitos?'))void controller.acceptRemoteConflict(row.id).catch(()=>setFailure('Não foi possível registrar a decisão. O conflito foi preservado.'));
      }}>Aceitar estado recebido e guardar tentativa</button>:null}
    </details>)}
  </div>;
}

function ConflictDetails({delivery}:{delivery:PendingDelivery}) {
  if(delivery.envelope.kind==='bootstrap')return <p>Carga inicial pendente de conferência. A origem foi preservada.</p>;
  const payload=delivery.envelope.operation.payload;
  const events=(payload.events??[]) as {id:string;description:string;amountCents:string;competenceDate:string}[];
  return <ul>{events.map((event)=><li key={event.id}>{event.description} · {formatBRL(BigInt(event.amountCents))} · {event.competenceDate}</li>)}</ul>;
}
