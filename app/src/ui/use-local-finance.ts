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
let runtime: Runtime | undefined;

function createRuntime() {
  const userId = getOrCreateLocalOwnerId();
  return {
    userId,
    store: createLocalFinancialStore(userId),
    context: createDefaultCommandContext(userId),
  };
}

function getRuntime(): Runtime {
  runtime ??= createRuntime();
  return runtime;
}

export function useLocalFinance() {
  const [local] = useState(getRuntime);
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
        if (localStorage.getItem(LOCAL_OWNER_KEY) !== local.userId) throw new Error('A base ativa mudou em outra aba. Recarregue antes de salvar.');
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
  }, [local, refresh]);

  const recover = async (json: string) => {
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

  return { state, loading, busy, error, clearError: () => setError(undefined), execute, recover, readState: () => local.store.readLocalState(), context: local.context, userId: local.userId };
}

function messageFrom(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação local.';
}
