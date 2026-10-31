import { describe, expect, it } from 'vitest';
import { createAccountCommand, type CommandContext } from '../application';
import type { LocalFinancialState } from '../domain';
import { serializeLocalBackup } from './local-backup';

const userId = '80000000-0000-4000-8000-000000000001';

it('exports a versioned local backup with canonical money and pending operations', () => {
  let sequence = 0;
  const context: CommandContext = {
    userId,
    nextId: () => `80000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    now: () => '2026-10-26T12:00:00.000Z',
    today: () => '2026-10-26',
  };
  const command = createAccountCommand({
    name: 'Conta sintética', kind: 'cash', availability: 'free', openingBalanceCents: 9_007n, openingDate: '2026-10-01',
  }, context);
  const state: LocalFinancialState = {
    accounts: command.aggregate.accounts ?? [],
    categories: [],
    events: command.aggregate.events ?? [],
    settlements: command.aggregate.settlements ?? [],
    postings: command.aggregate.postings ?? [],
    accountReconciliations: command.aggregate.accountReconciliations ?? [],
    outbox: [command.operation],
  };
  const backup = JSON.parse(serializeLocalBackup(state, userId, '2026-10-26T15:00:00.000Z')) as Record<string, any>;
  expect(backup.format).toBe('atlas-financeiro-local-backup');
  expect(backup.schemaVersion).toBe(2);
  expect(backup.manifest.accountReconciliations).toBe(1);
  expect(backup.manifest.pendingOperations).toBe(1);
  expect(backup.data.events[0].amountCents).toBe('9007');
  expect(backup.outbox[0].payload.events[0].amountCents).toBe('9007');
  expect(JSON.stringify(backup)).not.toContain('undefined');
  const invalidOwner = structuredClone(state);
  invalidOwner.outbox[0]!.userId = '90000000-0000-4000-8000-000000000001';
  expect(() => serializeLocalBackup(invalidOwner, userId)).toThrow(/outro usuário/);
  expect(() => serializeLocalBackup({ ...state, outbox: [...state.outbox, ...state.outbox] }, userId)).toThrow(/duplicada/);
  expect(() => serializeLocalBackup(state, userId, 'inválido')).toThrow(/Instante/);
});
