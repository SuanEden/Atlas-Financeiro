import { createAccountCommand, createCategoryCommand, createTransactionCommand, replaceEventCommand, reverseEventCommand, type CommandContext, type LocalCommand } from '../src/application';
import type { LocalFinancialState } from '../src/domain';

/** Isolated synthetic records only; never imported by application code. */
export function recoveryFixture(userId: string = crypto.randomUUID()): LocalFinancialState {
  let sequence = 0;
  const ctx: CommandContext = {
    userId, nextId: () => `d3000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    now: () => '2026-10-26T12:00:00.000Z', today: () => '2026-10-26',
  };
  const state: LocalFinancialState = { accounts: [], categories: [], events: [], settlements: [], postings: [], accountReconciliations: [], outbox: [] };
  const apply = (command: LocalCommand) => {
    for (const table of ['accounts', 'categories', 'events', 'settlements', 'postings', 'accountReconciliations'] as const) {
      // All aggregates append immutable records; this helper is intentionally test-only.
      (state[table] as unknown[]).push(...(command.aggregate[table] ?? []));
    }
    state.outbox.push(command.operation);
    return command.aggregate.events?.[0]?.id;
  };
  apply(createAccountCommand({ name: 'Conta sintética A', kind: 'cash', availability: 'free', openingDate: ctx.today(), openingBalanceCents: 100_003n, openingBalanceSource: 'Referência sintética de teste' }, ctx));
  apply(createAccountCommand({ name: 'Conta sintética B', kind: 'savings', availability: 'reserved', openingDate: ctx.today() }, ctx));
  apply(createCategoryCommand({ name: 'Categoria sintética', kind: 'both' }, ctx));
  const accountId = state.accounts[0]!.id;
  const base = { accountId, description: 'Evento sintético', date: ctx.today(), realized: true };
  const expense = apply(createTransactionCommand({ ...base, kind: 'expense', categoryId: state.categories[0]!.id, amountCents: 199n }, ctx))!;
  apply(replaceEventCommand(state, expense, { ...base, kind: 'expense', amountCents: 201n }, ctx));
  const transfer = apply(createTransactionCommand({ ...base, kind: 'transfer', transferAccountId: state.accounts[1]!.id, amountCents: 500n }, ctx))!;
  apply(reverseEventCommand(state, transfer, ctx));
  apply(createTransactionCommand({ ...base, kind: 'income', amountCents: 10_001n, realized: false, estimated: true }, ctx));
  const planned = apply(createTransactionCommand({ ...base, kind: 'expense', amountCents: 999n, realized: false }, ctx))!;
  apply(reverseEventCommand(state, planned, ctx));
  return state;
}
