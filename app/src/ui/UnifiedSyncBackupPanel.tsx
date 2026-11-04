import { useRef, useState, type ChangeEvent } from 'react';
import { validateSyncBackup, MAX_SYNC_BACKUP_BYTES } from '../sync/local-sync-store';

export function UnifiedSyncBackupPanel({ userId, serverId, onRecover, onImport, disabled = false }: {
  userId: string; serverId: string;
  onRecover: (json: string) => Promise<void>;
  onImport?: (json: string) => Promise<number>;
  disabled?: boolean;
}) {
  const request = useRef(0);
  const [json, setJson] = useState('');
  const [action, setAction] = useState<'import' | 'recover'>();
  const [summary, setSummary] = useState('');
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const token = ++request.current;
    setJson(''); setAction(undefined); setSummary(''); setApproved(false); setError(''); setNotice('');
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_SYNC_BACKUP_BYTES) throw new Error('O arquivo excede o limite de 10 MiB.');
      const contents = await file.text();
      const copy = await validateSyncBackup(contents, userId, serverId);
      if (token !== request.current) return;
      if (copy.pending.length > 0) {
        if (!onImport || copy.pending.some(row => row.status !== 'pending' || row.envelope.kind === 'bootstrap'))
          throw new Error('Esta cópia possui pendências incompatíveis com a importação. A recuperação é permitida apenas em destino vazio ou idêntico.');
        setAction('import');
        setSummary(`Arquivo verificado: ${copy.pending.length} operações para importar; ${copy.projection.accounts.length} contas e ${copy.projection.events.length} lançamentos na origem.`);
      } else {
        setAction('recover');
        setSummary(`Arquivo verificado: ${copy.projection.accounts.length} contas e ${copy.projection.events.length} lançamentos. Sem operações novas para importar.`);
      }
      setJson(contents);
    } catch (reason) {
      if (token === request.current) setError(reason instanceof Error ? reason.message : 'Arquivo incompatível.');
    }
  }
  async function apply() {
    if (!json || !action || !approved || busy || disabled) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'import') {
        const count = await onImport!(json);
        setNotice(count ? `${count} operações importadas. Elas poderão sincronizar com outros dispositivos.` : 'Nenhuma operação nova. Os dados foram preservados.');
      } else {
        await onRecover(json);
        setNotice('Cópia recuperada neste navegador. Nenhuma operação foi enviada.');
      }
      setApproved(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'A operação não foi concluída. Os dados foram preservados.');
    } finally { setBusy(false); }
  }
  return <div className="backup-unified-import">
    <label className="recovery-file">Selecionar arquivo JSON
      <input type="file" accept=".json,application/json" disabled={disabled || busy} onChange={event => void choose(event)} />
    </label>
    {summary ? <div className="recovery-preview">
      <p role="status">{summary}</p>
      <p className="warning-copy">{action === 'import'
        ? 'As operações serão acrescentadas à base atual e podem sincronizar com a nuvem. Não use dados fictícios aqui.'
        : 'Sem operações novas: a recuperação não substitui nem mistura bases. O destino precisa estar vazio ou já conter uma cópia idêntica.'}</p>
      <label className="recovery-confirm"><input type="checkbox" checked={approved} disabled={disabled || busy} onChange={event => setApproved(event.target.checked)} />Li a prévia e autorizo {action === 'import' ? 'acrescentar estas operações' : 'a recuperação em destino compatível'}.</label>
      <button className="button button--secondary" disabled={!approved || disabled || busy} onClick={() => void apply()}>{busy ? 'Verificando…' : action === 'import' ? 'Importar operações' : 'Recuperar cópia'}</button>
    </div> : null}
    {error && <p className="form-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
