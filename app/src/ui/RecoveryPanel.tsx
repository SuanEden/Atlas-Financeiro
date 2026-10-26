import { useRef, useState, type ChangeEvent } from 'react';
import { MAX_I2_BACKUP_BYTES, validateI2Backup, type ValidatedI2Backup } from '../backup/validate-i2-backup';

export function RecoveryPanel({ onRecover, busy }: { onRecover: (json: string) => Promise<void>; busy: boolean }) {
  const [preview, setPreview] = useState<ValidatedI2Backup>();
  const [json, setJson] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const reading = useRef(0);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const request = ++reading.current;
    setPreview(undefined); setJson(''); setConfirmed(false); setError(undefined);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_I2_BACKUP_BYTES) throw new Error('O arquivo excede o limite de 10 MiB.');
      const text = await file.text();
      if (request !== reading.current) return;
      const validated = validateI2Backup(text);
      setJson(text); setPreview(validated);
    } catch (reason) { if (request === reading.current) setError(reason instanceof Error ? reason.message : 'Arquivo inválido.'); }
  }

  async function recover() {
    if (!preview || !confirmed || busy) return;
    setError(undefined);
    try { await onRecover(json); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível recuperar.'); }
  }

  return <section className="scope-panel recovery-panel" aria-labelledby="recovery-title"><div>
    <h2 id="recovery-title">Recuperar uma exportação de I2</h2>
    <p>Use uma origem ou perfil vazio. IDs, valores, histórico e pendências serão preservados. A origem do arquivo não será alterada e nenhuma conta Google será associada.</p>
    <p>Não une nem substitui bases. Se já houver registros, somente uma cópia exatamente igual será reconhecida, sem duplicar operações. Limites: 10 MiB e 50 mil registros.</p>
    <label className="recovery-file">Arquivo JSON de I2<input type="file" accept="application/json,.json" onChange={(event) => void choose(event)} disabled={busy} /></label>
    {preview === undefined ? null : <div className="recovery-preview">
      <p role="status">Arquivo validado: {preview.state.accounts.length} contas, {preview.state.categories.length} categorias, {preview.state.events.length} lançamentos, {preview.state.outbox.length} operações pendentes.</p>
      <label className="recovery-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />Conferi o arquivo e confirmo a recuperação neste navegador, sem substituir dados.</label>
      <button className="button button--primary" disabled={!confirmed || busy} onClick={() => void recover()}>{busy ? 'Recuperando…' : 'Confirmar recuperação'}</button>
    </div>}
    {error === undefined ? null : <p role="alert" className="form-error">{error}</p>}
    <p>Restauração completa, substituição de bases e backups de versões futuras continuam fora desta função. Dados locais não têm criptografia própria.</p>
  </div></section>;
}
