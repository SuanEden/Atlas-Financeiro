import type { AuthPort } from '../src/auth/supabase-adapter';
import { SyncFailure, type SyncTransport } from '../src/sync/engine';
import type { SyncEnvelope } from '../src/sync/protocol';

export interface LiveCheckResult { ok: boolean; checks: string[]; message: string }

/** Development-only manual check. No store, association, valid write or token export. */
export async function checkLiveProtocol(auth: Pick<AuthPort, 'verify'>, transport: SyncTransport): Promise<LiveCheckResult> {
  const checks: string[] = [];
  let step: 'session'|'gate'|'pull'|'denial' = 'session';
  const failed = () => ({ ok: false, checks, message: {
    session: 'Entre novamente no Atlas com sua conta autorizada e repita a conferência.',
    gate: 'O envio não está bloqueado. Interrompa esta conferência.',
    pull: 'Não foi possível confirmar uma base remota vazia da mesma conta.',
    denial: 'Não foi possível confirmar o bloqueio da tentativa de envio.',
  }[step] });
  try {
    const identity = await auth.verify();
    if (identity.expiresAt <= Date.now() / 1000) return failed();
    checks.push('Sessão Google verificada.');
    step = 'gate';
    if (identity.writesEnabled !== false) return failed();
    checks.push('Envio financeiro continua bloqueado.');
    step = 'pull';
    const page = await transport.pull('0', null);
    if (page.protocolVersion !== 1 || page.userId !== identity.userId || page.after !== '0' ||
      page.through !== '0' || page.cursor !== '0' || !Array.isArray(page.batches) || page.batches.length !== 0) return failed();
    checks.push('Consulta ao servidor concluída: base remota vazia.');
    step = 'denial';
    try {
      // Invalid even if an administrator changes the gate concurrently. It is
      // rejected before any head/financial insertion; never build a valid command.
      await transport.apply({ protocolVersion: 0 } as unknown as SyncEnvelope);
      return failed();
    } catch (error) {
      if (!(error instanceof SyncFailure) || error.reason !== 'access_denied') return failed();
    }
    checks.push('Tentativa inválida de envio recusada.');
    return { ok: true, checks, message: 'Conferência concluída. Nenhuma base foi associada.' };
  } catch {
    // Backend messages/URLs can contain private values. Only fixed text escapes.
    return failed();
  }
}
