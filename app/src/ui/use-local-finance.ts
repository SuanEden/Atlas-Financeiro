import { useCallback, useEffect, useRef, useState } from 'react';
import { createDefaultCommandContext, getOrCreateLocalOwnerId, type LocalCommand } from '../application';
import type { LocalFinancialState } from '../domain';
import { createLocalFinancialStore } from '../persistence';
import { recoverIntoEmptyOrigin, withLocalWriteLock } from '../application/recover-local-backup';
import { LOCAL_OWNER_KEY } from '../application/local-identity';

const EMPTY_STATE: LocalFinancialState = {
  accounts: [], categories: [], events: [], settlements: [], postings: [], outbox: [],
};

type Runtime = ReturnType<typeof createRuntime>;
const runtimes: Partial<Record<'normal' | 'test', Runtime>> = {};
export const TEST_OWNER_KEY = 'atlas-financeiro:test-owner:v1';

function createRuntime(mode: 'normal' | 'test') {
  const userId = mode === 'test' ? getOrCreateTestOwner() : getOrCreateLocalOwnerId();
  return {
    userId,
    store: createLocalFinancialStore(userId),
    context: createDefaultCommandContext(userId),
  };
}

function getOrCreateTestOwner(): string {
  const existing = localStorage.getItem(TEST_OWNER_KEY);
  if (existing && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(existing)) return existing;
  const owner = crypto.randomUUID();
  localStorage.setItem(TEST_OWNER_KEY, owner);
  return owner;
}

function getRuntime(mode: 'normal' | 'test'): Runtime {
  return runtimes[mode] ??= createRuntime(mode);
}

export function useLocalFinance(mode: 'normal' | 'test' = 'normal') {
  const [local] = useState(() => getRuntime(mode));
  const [state, setState] = useState<LocalFinancialState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const executing = useRef(false);

  const refresh = useCallback(async () => {
    const next = await local.store.readLocalState();
    setState(next);
  }, [local]);

  useEffect(() => {
    let active = true;
    local.store.readLocalState()
      .then((next) => { if (active) setState(next); })
      .catch((reason: unknown) => { if (active) setError(messageFrom(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [local]);

  const execute = useCallback(async (command: LocalCommand) => {
    if (executing.current) throw new Error('Uma operação já está sendo salva. Aguarde.');
    executing.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await withLocalWriteLock(async () => {
        if (localStorage.getItem(mode === 'test' ? TEST_OWNER_KEY : LOCAL_OWNER_KEY) !== local.userId) throw new Error('A base ativa mudou em outra aba. Recarregue antes de salvar.');
        await local.store.commitOperation(command.aggregate, command.operation);
      });
      await refresh();
    } catch (reason) {
      const message = messageFrom(reason);
      setError(message);
      throw new Error(message, { cause: reason });
    } finally {
      executing.current = false;
      setBusy(false);
    }
  }, [local, refresh, mode]);

  const modifyEntity = useCallback(async (
    action: 'edit' | 'delete',
    entity: 'account' | 'category',
    id: string,
    changes?: { name: string; kind: string; availability?: string; parentId?: string },
  ) => {
    if (executing.current) throw new Error('Uma operação já está em andamento.');
    executing.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await withLocalWriteLock(async () => {
        if (localStorage.getItem(mode === 'test' ? TEST_OWNER_KEY : LOCAL_OWNER_KEY) !== local.userId)
          throw new Error('A base ativa mudou em outra aba. Recarregue antes de salvar.');
        if (action === 'delete') await local.store.deleteUnusedEntity(entity, id);
        else {
          if (!changes) throw new TypeError('Informe os dados da edição.');
          await local.store.editEntityMetadata(entity, id, changes as Parameters<typeof local.store.editEntityMetadata>[2]);
        }
      });
      await refresh();
    } catch (reason) {
      setError(messageFrom(reason));
      throw reason;
    } finally {
      executing.current = false;
      setBusy(false);
    }
  }, [local, refresh, mode]);

  const recover = async (json: string) => {
    if (mode === 'test') throw new Error('Para preservar o isolamento, o ambiente de teste não permite recuperar cópias de outra base. Crie lançamentos de teste diretamente neste ambiente.');
    if (executing.current) throw new Error('Aguarde a operação em andamento.');
    executing.current = true;
    setBusy(true);
    try {
      await recoverIntoEmptyOrigin(json, local.userId, localStorage);
      window.location.reload();
    } catch (reason) {
      executing.current = false;
      setBusy(false);
      throw reason;
    }
  };

  const restoreEntity=async(_entity:'account'|'category',_id:string):Promise<void>=>{
    throw new Error('A restauração de registros arquivados exige a sincronização I3.');
  };
  return { state, loading, busy, error, clearError: () => setError(undefined), execute, modifyEntity, restoreEntity, recover, readState: () => local.store.readLocalState(), context: local.context, userId: local.userId };
}

function messageFrom(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação local.';
}
