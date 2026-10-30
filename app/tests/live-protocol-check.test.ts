import { describe, expect, it, vi } from 'vitest';
import { checkLiveProtocol } from './live-protocol-check';
import { SyncFailure } from '../src/sync/engine';
import type { AuthIdentity } from '../src/auth/supabase-adapter';
import type { ChangePage } from '../src/sync/protocol';

const userId = 'a3000000-0000-4000-8000-000000000001';
function fixture() {
  const identity: AuthIdentity = { userId, expiresAt: Date.now() / 1000 + 600, writesEnabled: false };
  const page: ChangePage = { protocolVersion: 1, userId, after: '0', through: '0', cursor: '0', batches: [] };
  const auth = { verify: vi.fn(async () => identity) };
  const transport = { pull: vi.fn(async () => page), apply: vi.fn(async () => { throw new SyncFailure('access_denied', 'REMOTE_ACCESS_BLOCKED'); }) };
  return { identity, page, auth, transport };
}

describe('conferência manual do protocolo sem escrita/associação', () => {
  it('consulta a conta e usa somente um payload inválido para conferir a recusa', async () => {
    const f = fixture(); const result = await checkLiveProtocol(f.auth, f.transport);
    expect(result.ok).toBe(true); expect(result.checks).toHaveLength(4);
    expect(f.transport.pull).toHaveBeenCalledExactlyOnceWith('0', null);
    expect(f.transport.apply).toHaveBeenCalledExactlyOnceWith({ protocolVersion: 0 });
    expect(JSON.stringify(result)).not.toContain(userId);
  });
  it('interrompe antes de consultar/enviar quando a escrita está habilitada', async () => {
    const f = fixture(); f.identity.writesEnabled = true;
    expect((await checkLiveProtocol(f.auth, f.transport)).ok).toBe(false);
    expect(f.transport.pull).not.toHaveBeenCalled(); expect(f.transport.apply).not.toHaveBeenCalled();
  });
  it('sessão vencida não consulta nem tenta enviar', async () => {
    const f = fixture(); f.identity.expiresAt = 1;
    expect((await checkLiveProtocol(f.auth, f.transport)).ok).toBe(false);
    expect(f.transport.pull).not.toHaveBeenCalled(); expect(f.transport.apply).not.toHaveBeenCalled();
  });
  it('falha de sessão nunca retorna mensagem privada de backend', async () => {
    const f = fixture(); f.auth.verify.mockRejectedValue(new Error('PRIVATE_BACKEND_DETAIL'));
    const result = await checkLiveProtocol(f.auth, f.transport);
    expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain('PRIVATE_BACKEND_DETAIL');
    expect(f.transport.pull).not.toHaveBeenCalled(); expect(f.transport.apply).not.toHaveBeenCalled();
  });
  it.each(['foreign-owner', 'nonempty'])('não tenta envio para resposta %s', async kind => {
    const f = fixture();
    if (kind === 'foreign-owner') f.page.userId = 'a3000000-0000-4000-8000-000000000002';
    else f.page.through = '1';
    expect((await checkLiveProtocol(f.auth, f.transport)).ok).toBe(false);
    expect(f.transport.apply).not.toHaveBeenCalled();
  });
  it('falha de consulta é sanitizada e impede a tentativa de envio', async () => {
    const f = fixture(); f.transport.pull.mockRejectedValue(new Error('PRIVATE_BACKEND_DETAIL'));
    const result = await checkLiveProtocol(f.auth, f.transport);
    expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain('PRIVATE_BACKEND_DETAIL');
    expect(f.transport.apply).not.toHaveBeenCalled();
  });
  it.each(['login_required', 'offline'] as const)('não confunde falha %s com recusa de autorização', async reason => {
    const f = fixture(); f.transport.apply.mockRejectedValue(new SyncFailure(reason, 'PRIVATE_BACKEND_DETAIL'));
    const result = await checkLiveProtocol(f.auth, f.transport);
    expect(result.ok).toBe(false); expect(JSON.stringify(result)).not.toContain('PRIVATE_BACKEND_DETAIL');
  });
  it('resposta inesperada de sucesso não é aceita como prova de bloqueio', async () => {
    const f = fixture();
    const transport = { ...f.transport, apply: vi.fn(async () => ({ protocolVersion: 1 as const, userId, operationId: userId, revision: '1', digest: '', coveredOperations: [] })) };
    expect((await checkLiveProtocol(f.auth, transport)).ok).toBe(false);
  });
});
