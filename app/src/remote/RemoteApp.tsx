import { PluggyReadPanel } from './PluggyReadPanel';
import { SyncRecoveryPanel } from '../ui/SyncRecoveryPanel';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
  const [dark]=useState(()=>localStorage.getItem('atlas-financeiro:theme:v2')!=='light');
  const canAssociate=snapshot.session.onlineVerified&&snapshot.session.canTransmit;
  const canInspectAssociation=snapshot.session.onlineVerified;
  const [association,setAssociation]=useState<{binding:string;pending:number;conflicts:number;receipts:number;revision:string}|null>(null);
  const [associationReadError,setAssociationReadError]=useState(false);
  const associationReadSequence=useRef(0);
  async function refreshAssociation() {
    const sequence=++associationReadSequence.current;
    const store=controller.getSnapshot().store;
    if(!store){setAssociation(null);setAssociationReadError(false);return;}
    try {
      const state=await store.read();
      if(controller.getSnapshot().store!==store||associationReadSequence.current!==sequence)return;
      setAssociation({binding:state.meta.binding,pending:state.pending.filter(row=>row.status==='pending').length,conflicts:state.pending.filter(row=>row.status==='conflict'||row.status==='blocked').length,receipts:state.receipts.length,revision:state.meta.cursor});
      setAssociationReadError(false);
    }catch{if(controller.getSnapshot().store===store&&associationReadSequence.current===sequence){setAssociation(null);setAssociationReadError(true);}}
  }
  useEffect(()=>{void refreshAssociation();},[snapshot.store,snapshot.dataRevision,snapshot.syncing]);
  async function run(action:()=>Promise<unknown>) {
    setBusy(true);setFailure('');
    try {await action();}catch{setFailure('Não foi possível concluir. Os dados e a origem foram preservados. Confira a sessão e tente novamente.');}
    finally {await refreshAssociation();setBusy(false);}
  }
  return <main className="app-shell access-page" data-theme={dark?'dark':'light'}><section className="access-card">
    <span className="brand-mark" aria-hidden="true">A</span><h1>Atlas Financeiro</h1>
    <p role="status">{snapshot.session.message}</p><p>{snapshot.notice}</p>
    {failure?<p role="alert">{failure}</p>:null}
    {!snapshot.session.onlineVerified?<button className="button button--primary" disabled={busy} onClick={()=>void controller.login()}>Entrar com Google</button>:null}
    {snapshot.session.onlineVerified?<button className="button button--ghost" disabled={busy} onClick={()=>void controller.logout()}>Sair e bloquear acesso local</button>:null}
    {snapshot.session.onlineVerified&&!snapshot.session.canTransmit?<section className="association-panel"><p>O servidor ainda não liberou gravações financeiras. Nenhum envio será executado.</p><button className="text-button" disabled={busy} onClick={()=>void run(async()=>{setPreview(await controller.previewLocalSource());})}>Conferir base local sem enviar</button>{preview?<p>Base local: {preview.accounts} contas, {preview.events} lançamentos e {preview.pending} operações pendentes. A origem permanece neste dispositivo.</p>:null}</section>:null}
    {canInspectAssociation?<section className="association-panel" aria-label="Associação inicial">
      <h2>{association?.binding==='unbound'?'Escolha como começar neste navegador':'Conferência da associação'}</h2>
      {associationReadError?<p role="alert">Não foi possível conferir o estado local. Nenhuma nova associação está liberada. Preserve este navegador e suas cópias.</p>:null}
      {!association&&!associationReadError?<p role="status">Conferindo a associação local antes de liberar opções…</p>:null}
      {association?.binding==='unbound'&&!canAssociate?<p role="status">A associação ainda não começou. O servidor mantém o envio bloqueado; nenhuma nova base será iniciada.</p>:null}
      {association?.binding==='unbound'&&canAssociate?<>
        <p>Confirme a conta Google antes de continuar. Dados de teste não devem ser usados como sua base pessoal.</p>
        <label><input type="checkbox" checked={confirmed} onChange={(event)=>setConfirmed(event.target.checked)} />Conferi a conta e autorizo somente a opção que escolher abaixo.</label>
        <button className="button button--secondary" disabled={busy||!confirmed} onClick={()=>void run(()=>controller.associateEmpty())}>Iniciar uma base vazia</button>
        <button className="button button--secondary" disabled={busy||!confirmed} onClick={()=>void run(()=>controller.joinExisting())}>Receber minha base já associada</button>
        <button className="text-button" disabled={busy} onClick={()=>void run(async()=>{setPreview(await controller.previewLocalSource());})}>Conferir base local I2 para associação</button>
        {preview?<div><p>{preview.accounts} contas, {preview.events} lançamentos e {preview.pending} operações locais. A origem será preservada. Feche abas antigas de I2 antes de copiar.</p><button className="button button--secondary" disabled={busy||!confirmed} onClick={()=>void run(()=>controller.associateLocal(preview.digest))}>Confirmar cópia da base conferida</button></div>:null}
      </>:null}
      {association&&association.binding!=='unbound'?<>
        <p role="status">{association.binding==='bootstrap'?'A cópia inicial está preparada e aguarda confirmação do servidor.':association.binding==='verifying_source'?'O servidor recebeu a associação; falta confirmar que a origem local não mudou.':association.binding==='join'?'Este navegador está recebendo a base já associada.':'A associação local está ativa; confira a sessão antes de qualquer nova tentativa.'}</p>
        <p>{association.pending} operações pendentes; {association.conflicts} alterações com conflito ou dependência.</p>
        <p className="warning-copy">Diagnóstico local: revisão {association.revision}, {association.receipts} recibos confirmados neste navegador. Esses números não comprovam que os dados pessoais estejam na nuvem.</p>
        {association.conflicts>0?<p role="alert">Existem alterações bloqueadas ou conflitantes. Preserve o backup I3 e não tente iniciar outra base neste navegador.</p>:null}
        {canAssociate?<button className="text-button" disabled={busy||snapshot.syncing} onClick={()=>void run(()=>controller.sync())}>Retomar associação pendente</button>:<p role="status">Envio bloqueado pelo servidor. A associação está preservada neste navegador e não pode ser retomada até a liberação da escrita.</p>}
      </>:null}
    </section>:null}
    {snapshot.session.onlineVerified ? <PluggyReadPanel controller={controller} /> : null}
    {snapshot.session.onlineVerified ? <SyncRecoveryPanel userId={snapshot.session.userId} serverId={controller.serverId} onRecover={json => controller.recoverBackup(json)} disabled={busy || snapshot.syncing} /> : null}
    <p><a className="text-button" href="/">Voltar ao Atlas local (sem migrar)</a></p>
    <p className="warning-copy">Sair bloqueia a visualização neste perfil sem apagar pendências. Esta proteção local não é criptografia. O envio exige sessão verificada e liberação do servidor.</p>
  </section></main>;
}

function RemoteWorkspace({controller}:{controller:RemoteController}) {
  const finance=useRemoteFinance(controller);
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  // Foreground-only synchronization. Never run while closed, offline, signed
  // out, or while server writes remain disabled. The engine is idempotent.
  const canTransmit=snapshot.session.canTransmit;
  const canView=snapshot.session.canView;
  useEffect(()=>{
    if(!canView||!canTransmit)return;
    const sync=()=>{if(document.visibilityState==='visible'&&navigator.onLine!==false)void controller.sync();};
    sync();
    // Keep remote updates visible without a hard reload. Only poll in the
    // foreground; the controller coalesces overlapping sync attempts.
    const timer=window.setInterval(sync,10_000);
    const focus=()=>sync();
    window.addEventListener('online',focus);
    window.addEventListener('focus',focus);
    document.addEventListener('visibilitychange',focus);
    return()=>{window.clearInterval(timer);window.removeEventListener('online',focus);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  },[controller,canView,canTransmit]);
  async function exportJson() {
    const current=controller.getSnapshot();const store=current.store;
    if(!current.session.canView||!store)throw new Error('Entre novamente antes de exportar.');
    const json=await exportSyncBackup(store,controller.serverId);
    if(!controller.getSnapshot().session.canView||controller.getSnapshot().session.userId!==store.userId)throw new Error('A sessão mudou.');
    return json;
  }
  // Include association/bootstrap deliveries in the cloud badge and manual sync action.
  // These are intentionally absent from the financial outbox projection.
  const [pendingInStore, setPendingInStore] = useState(0);
  useEffect(() => {
    let active = true;
    if (!snapshot.store) { setPendingInStore(0); return; }
    void snapshot.store.read().then((data) => {
      if (active) setPendingInStore(data.pending.filter((row) => row.status === 'pending').length);
    }).catch(() => { /* The financial workspace reports storage errors separately. */ });
    return () => { active = false; };
  }, [snapshot.store, snapshot.dataRevision, snapshot.syncing]);
  const pendingCount = Math.max(finance.state.outbox.length, pendingInStore);
  // A zero-length outbox is not proof of server confirmation.
  const cloudStatus = !snapshot.session.onlineVerified ? 'Acesso offline'
    : !snapshot.session.canTransmit ? 'Envio indisponível'
    : snapshot.syncing ? 'Sincronizando'
    : pendingCount > 0 ? 'Alterações pendentes'
    : snapshot.lastSyncResult === 'synced' ? 'Sincronizado'
    : snapshot.lastSyncResult === null ? 'Aguardando conferência'
    : 'Conferência necessária';
  const cloudTone = !snapshot.session.onlineVerified || !snapshot.session.canTransmit ? 'offline'
    : snapshot.lastSyncResult === 'synced' && !snapshot.syncing && pendingCount === 0 ? 'synced'
    : 'pending';
  const cloudControls = <section className="cloud-control-card" aria-label="Sincronização">
    <div className="cloud-control-heading"><span className="cloud-control-mark" aria-hidden="true">☁</span><div><h2>Modo nuvem</h2><p>Cópia local ativa</p></div></div>
    <div className="cloud-control-state" data-status={cloudTone}><span className="cloud-control-dot" aria-hidden="true" /><strong>{cloudStatus}</strong></div>
    <p className="cloud-control-description" role="status">{snapshot.notice || snapshot.session.message}</p>
    <p className="cloud-control-pending">{pendingCount} {pendingCount === 1 ? 'operação pendente' : 'operações pendentes'}</p>
    <div className="cloud-control-actions">
      {pendingCount > 0 ? <button className="button button--secondary" disabled={!snapshot.session.canTransmit || snapshot.syncing} onClick={() => void controller.sync()}>{snapshot.syncing ? 'Conferindo envio…' : 'Sincronizar agora'}</button> : null}
      {!snapshot.session.onlineVerified ? <button className="text-button" onClick={() => void controller.login()}>Entrar novamente</button> : null}
      <button className="text-button" onClick={() => void controller.logout()}>Sair e bloquear</button>
    </div>
    <Conflicts controller={controller} />
  </section>;
  return <FinancialWorkspace finance={finance} integration entityManagementEnabled={snapshot.session.onlineVerified&&snapshot.session.canTransmit&&snapshot.session.serverSchemaVersion===4} serverId={controller.serverId} exportJson={exportJson} importJson={json=>controller.importBackupOperations(json)} bankPanel={<PluggyReadPanel controller={controller} importTarget={{accounts:finance.state.accounts,readState:finance.readState,execute:finance.execute,context:finance.context,canWrite:snapshot.session.canWriteLocal && snapshot.session.canTransmit}}/>} sessionControls={cloudControls} />;
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
