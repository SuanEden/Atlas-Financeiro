import { useCallback, useEffect, useRef, useState } from 'react';
import { createDefaultCommandContext, getOrCreateLocalOwnerId, type LocalCommand } from '../application';
import type { LocalFinancialState } from '../domain';
import { createLocalFinancialStore } from '../persistence';

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
      await local.store.commitOperation(command.aggregate, command.operation);
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

  return { state, loading, busy, error, clearError: () => setError(undefined), execute, readState: () => local.store.readLocalState(), context: local.context, userId: local.userId };
}

function messageFrom(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Não foi possível concluir a operação local.';
}
