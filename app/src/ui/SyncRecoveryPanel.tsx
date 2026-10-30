import { useId, useRef, useState, type ChangeEvent } from 'react';
import { MAX_SYNC_BACKUP_BYTES, validateSyncBackup } from '../sync/local-sync-store';

export function SyncRecoveryPanel({userId, serverId, onRecover, disabled = false}: {
  userId: string; serverId: string; onRecover: (json: string) => Promise<void>; disabled?: boolean;
}) {
  const title = useId();
  const request = useRef(0);
  const [json, setJson] = useState('');
  const [summary, setSummary] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const version = ++request.current;
    setJson(''); setSummary(''); setConfirmed(false); setError(''); setNotice('');
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > MAX_SYNC_BACKUP_BYTES) throw new Error('O arquivo excede o limite de 10 MiB.');
      const text = await file.text();
      const copy = await validateSyncBackup(text, userId, serverId);
      if (version !== request.current) return;
      setJson(text);
      setSummary(`${copy.projection.accounts.length} contas, ${copy.projection.events.length} lançamentos e ${copy.pending.length} operações preservadas.`);
    } catch (reason) { if (version === request.current) setError(reason instanceof Error ? reason.message : 'Arquivo inválido.'); }
  }
  async function recover() {
    if (!json || !confirmed || busy || disabled) return;
    setBusy(true); setError('');
    try { await onRecover(json); setNotice('Cópia recuperada neste navegador. Nenhuma operação foi enviada.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível recuperar.'); }
    finally { setBusy(false); }
  }
  return <section className="scope-panel recovery-panel" aria-labelledby={title}><div>
    <h2 id={title}>Recuperar cópia de sincronização I3</h2>
    <p>Entre com a mesma conta Google e use um perfil vazio. A recuperação preserva histórico e pendências, sem unir bases ou enviar operações. Limite: 10 MiB e 50 mil registros, contando base, projeção e metadados.</p>
    <label>Arquivo JSON de I3<input type="file" accept="application/json,.json" disabled={disabled || busy} onChange={event => void choose(event)} /></label>
    {summary ? <div><p role="status">{summary}</p>
      <label><input type="checkbox" checked={confirmed} disabled={disabled || busy} onChange={event => setConfirmed(event.target.checked)} />Conferi a cópia e confirmo recuperar sem substituir dados.</label>
      <button className="button button--secondary" disabled={!confirmed || disabled || busy} onClick={() => void recover()}>{busy ? 'Recuperando…' : 'Recuperar cópia I3'}</button></div> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {notice ? <p role="status">{notice}</p> : null}
    <p>O arquivo não contém login e não concede acesso ao servidor. Dados locais e arquivos não têm criptografia própria. Uma cópia anterior não pode substituir uma base mais recente.</p>
  </div></section>;
}
