import { useId, useRef, useState, type ChangeEvent } from 'react';
import { MAX_SYNC_BACKUP_BYTES, validateSyncBackup } from '../sync/local-sync-store';

export function SyncImportPanel({userId, serverId, onImport, disabled=false}:{
  userId:string;serverId:string;onImport:(json:string)=>Promise<number>;disabled?:boolean;
}) {
  const heading=useId();
  const request=useRef(0);
  const [json,setJson]=useState('');
  const [summary,setSummary]=useState('');
  const [approved,setApproved]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  async function choose(event:ChangeEvent<HTMLInputElement>) {
    const token=++request.current;
    setJson('');setSummary('');setApproved(false);setError('');setNotice('');
    const file=event.target.files?.[0];
    if(!file)return;
    try {
      if(file.size>MAX_SYNC_BACKUP_BYTES)throw new Error('O arquivo excede 10 MiB.');
      const contents=await file.text();
      const copy=await validateSyncBackup(contents,userId,serverId);
      if(copy.pending.some(row=>row.status!=='pending'||row.envelope.kind==='bootstrap'))
        throw new Error('Este arquivo contém conflitos ou associação inicial pendente. Use a recuperação I3 em vez da importação.');
      if(token!==request.current)return;
      setJson(contents);
      setSummary(`${copy.pending.length} operações novas ou já existentes no arquivo. Base de origem: ${copy.confirmed.accounts.length} contas, ${copy.confirmed.events.length} lançamentos. Prévia final: ${copy.projection.accounts.length} contas, ${copy.projection.events.length} lançamentos.`);
    } catch(reason) {
      if(token===request.current)setError(reason instanceof Error?reason.message:'Arquivo inválido.');
    }
  }
  async function importOperations(){
    if(!json||!approved||busy||disabled)return;
    setBusy(true);setError('');setNotice('');
    try{
      const added=await onImport(json);
      setNotice(added?`${added} operações novas importadas. As alterações poderão sincronizar automaticamente com os outros dispositivos.`:'Nenhuma operação nova. A base foi preservada.');
      setApproved(false);
    }catch(reason){
      setError(reason instanceof Error?reason.message:'Importação não concluída. Os dados anteriores foram preservados.');
    }finally{setBusy(false);}
  }
  return <section className="scope-panel recovery-panel" aria-labelledby={heading}><div>
    <h2 id={heading}>Importar operações de um JSON I3</h2>
    <p>Acrescenta somente operações do mesmo usuário e histórico, sem apagar ou substituir dados atuais. Identificadores repetidos são ignorados; divergências bloqueiam a importação inteira.</p>
    <label>Arquivo JSON I3 para importar<input type="file" accept=".json,application/json" disabled={busy||disabled} onChange={event=>void choose(event)}/></label>
    {summary?<div><p role="status">{summary}</p>
      <p className="warning-copy"><strong>Atenção:</strong> os dados importados entrarão na sua base financeira e poderão ser enviados automaticamente à nuvem. Arquivos fictícios também podem aparecer em seus outros dispositivos. Não utilize este recurso para isolar dados de teste.</p>
      <label><input type="checkbox" checked={approved} disabled={busy||disabled} onChange={event=>setApproved(event.target.checked)}/>Entendi que as operações serão adicionadas à minha base atual e poderão sincronizar.</label>
      <button className="button button--secondary" disabled={!approved||busy||disabled} onClick={()=>void importOperations()}>{busy?'Importando…':'Importar operações novas'}</button>
    </div>:null}
    {error?<p className="form-error" role="alert">{error}</p>:null}
    {notice?<p role="status">{notice}</p>:null}
  </div></section>;
}
