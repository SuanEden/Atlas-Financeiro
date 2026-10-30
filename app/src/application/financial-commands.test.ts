import { describe, expect, it } from 'vitest';
import { calculateAccountBalance, calculateCashTotals, assertFinancialDataset, hasReconciledOpeningBalance, type FinancialDataset } from '../domain';
import {
  createAccountCommand,
  createCategoryCommand,
  createTransactionCommand,
  reconcileAccountCommand,
  replaceEventCommand,
  reverseEventCommand,
  type CommandContext,
  type LocalCommand,
} from './financial-commands';

const userId = '70000000-0000-4000-8000-000000000001';

function context(): CommandContext {
  let sequence = 0;
  return {
    userId,
    nextId: () => `70000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    now: () => '2026-10-26T12:00:00.000Z',
    today: () => '2026-10-26',
  };
}

function empty(): FinancialDataset {
  return { accounts: [], categories: [], events: [], settlements: [], postings: [] };
}

function apply(dataset: FinancialDataset, command: LocalCommand): FinancialDataset {
  return {
    accounts: [...dataset.accounts, ...(command.aggregate.accounts ?? [])],
    categories: [...dataset.categories, ...(command.aggregate.categories ?? [])],
    events: [...dataset.events, ...(command.aggregate.events ?? [])],
    settlements: [...dataset.settlements, ...(command.aggregate.settlements ?? [])],
    postings: [...dataset.postings, ...(command.aggregate.postings ?? [])],
  };
}

describe('comandos financeiros locais', () => {
  it('cria conta e saldo inicial como ajuste, com outbox canônica', () => {
    const ctx = context();
    const command = createAccountCommand({
      name: 'Conta local', kind: 'checking', availability: 'free', openingBalanceCents: 12_345n, openingDate: '2026-10-01',
    }, ctx);
    const dataset = apply(empty(), command);
    expect(() => assertFinancialDataset(dataset, userId)).not.toThrow();
    expect(calculateAccountBalance(dataset, dataset.accounts[0]!.id)).toBe(12_345n);
    expect(calculateCashTotals(dataset, { start: '2026-10-01', end: '2026-10-31' }).incomeCents).toBe(0n);
    expect(command.operation.kind).toBe('create_account');
    expect(JSON.parse(command.operation.payloadJson).events[0].amountCents).toBe('12345');
  });

  it('registra, estorna e substitui despesa sem apagar o histórico', () => {
    const ctx = context();
    let dataset = apply(empty(), createAccountCommand({
      name: 'Carteira', kind: 'cash', availability: 'free', openingBalanceCents: 5_000n, openingDate: '2026-10-01',
    }, ctx));
    const accountId = dataset.accounts[0]!.id;
    const category = createCategoryCommand({ name: 'Mercado', kind: 'expense' }, ctx);
    dataset = apply(dataset, category);
    const first = createTransactionCommand({
      kind: 'expense', amountCents: 1_800n, accountId, categoryId: dataset.categories[0]!.id,
      description: 'Compra original', date: '2026-10-10', realized: true,
    }, ctx);
    dataset = apply(dataset, first);
    const originalId = first.aggregate.events![0]!.id;
    const replacement = replaceEventCommand(dataset, originalId, {
      kind: 'expense', amountCents: 2_000n, accountId, categoryId: dataset.categories[0]!.id,
      description: 'Compra corrigida', date: '2026-10-10', realized: true,
    }, ctx);
    dataset = apply(dataset, replacement);
    assertFinancialDataset(dataset, userId);
    expect(dataset.events).toHaveLength(4); // saldo inicial, original, estorno e substituição
    expect(dataset.events.some((event) => event.reversesEventId === originalId)).toBe(true);
    expect(dataset.events.some((event) => event.replacesEventId === originalId)).toBe(true);
    expect(calculateCashTotals(dataset, { start: '2026-10-01', end: '2026-10-31' }).expenseCents).toBe(2_000n);
    expect(calculateAccountBalance(dataset, accountId)).toBe(3_000n);
  });

  it('estorna transferência com contrapartidas inversas e conserva o patrimônio', () => {
    const ctx = context();
    let dataset = apply(empty(), createAccountCommand({ name: 'Origem', kind: 'cash', availability: 'free', openingBalanceCents: 10_000n, openingDate: '2026-10-01' }, ctx));
    dataset = apply(dataset, createAccountCommand({ name: 'Reserva', kind: 'savings', availability: 'reserved', openingDate: '2026-10-01' }, ctx));
    const transfer = createTransactionCommand({
      kind: 'transfer', amountCents: 2_500n, accountId: dataset.accounts[0]!.id,
      transferAccountId: dataset.accounts[1]!.id, description: 'Separar reserva', date: '2026-10-20', realized: true,
    }, ctx);
    dataset = apply(dataset, transfer);
    const before = dataset.postings.reduce((sum, posting) => sum + posting.amountCents, 0n);
    dataset = apply(dataset, reverseEventCommand(dataset, transfer.aggregate.events![0]!.id, ctx));
    assertFinancialDataset(dataset, userId);
    expect(dataset.postings.reduce((sum, posting) => sum + posting.amountCents, 0n)).toBe(before);
    expect(calculateAccountBalance(dataset, dataset.accounts[0]!.id)).toBe(10_000n);
    expect(calculateAccountBalance(dataset, dataset.accounts[1]!.id)).toBe(0n);
  });

  it('substitui previsão sem criar caixa', () => {
    const ctx = context();
    let dataset = apply(empty(), createAccountCommand({ name: 'Conta', kind: 'checking', availability: 'free', openingDate: '2026-10-01' }, ctx));
    const planned = createTransactionCommand({
      kind: 'income', amountCents: 1_000n, accountId: dataset.accounts[0]!.id,
      description: 'Previsão', date: '2026-11-01', realized: false, estimated: true,
    }, ctx);
    dataset = apply(dataset, planned);
    dataset = apply(dataset, replaceEventCommand(dataset, planned.aggregate.events![0]!.id, {
      kind: 'income', amountCents: 1_500n, accountId: dataset.accounts[0]!.id,
      description: 'Previsão revisada', date: '2026-11-02', realized: false, estimated: true,
    }, ctx));
    assertFinancialDataset(dataset, userId);
    expect(dataset.settlements).toHaveLength(0);
    expect(calculateAccountBalance(dataset, dataset.accounts[0]!.id)).toBe(0n);
  });
});



describe('conciliação inicial de contas', () => {
  it('registra saldo zero confirmado sem inventar lançamento ou contrapartida', () => {
    const ctx = context();
    let dataset = apply(empty(), createAccountCommand({
      name: 'Conta principal', kind: 'checking', availability: 'free', openingDate: '2026-10-30',
    }, ctx));
    const accountId = dataset.accounts[0]!.id;
    const reconciliation = reconcileAccountCommand(dataset, {
      accountId, balanceCents: 0n, referenceDate: '2026-10-30',
      sourceDescription: 'Saldo exibido no aplicativo do banco', certainty: 'confirmed',
    }, ctx);
    dataset = apply(dataset, reconciliation);
    assertFinancialDataset(dataset, userId);
    expect(dataset.events).toHaveLength(1);
    expect(dataset.events[0]!.amountCents).toBe(0n);
    expect(dataset.settlements).toHaveLength(0);
    expect(dataset.postings).toHaveLength(0);
    expect(hasReconciledOpeningBalance(dataset, accountId)).toBe(true);
    expect(calculateAccountBalance(dataset, accountId)).toBe(0n);
  });

  it('mantém estimativa fora do saldo e substitui pela conciliação confirmada sem apagar o histórico', () => {
    const ctx = context();
    let dataset = apply(empty(), createAccountCommand({
      name: 'Dinheiro', kind: 'cash', availability: 'free', openingDate: '2026-10-30',
    }, ctx));
    const accountId = dataset.accounts[0]!.id;
    const estimate = reconcileAccountCommand(dataset, {
      accountId, balanceCents: 3_200n, referenceDate: '2026-10-30',
      sourceDescription: 'Estimativa do usuário', certainty: 'estimated',
    }, ctx);
    dataset = apply(dataset, estimate);
    expect(hasReconciledOpeningBalance(dataset, accountId)).toBe(false);
    expect(calculateAccountBalance(dataset, accountId)).toBe(0n);

    const confirmed = reconcileAccountCommand(dataset, {
      accountId, balanceCents: 2_800n, referenceDate: '2026-10-30',
      sourceDescription: 'Saldo conferido no aplicativo', certainty: 'confirmed',
    }, ctx);
    dataset = apply(dataset, confirmed);
    assertFinancialDataset(dataset, userId);
    expect(dataset.events).toHaveLength(2);
    expect(dataset.events[1]!.replacesEventId).toBe(dataset.events[0]!.id);
    expect(hasReconciledOpeningBalance(dataset, accountId)).toBe(true);
    expect(calculateAccountBalance(dataset, accountId)).toBe(2_800n);
  });
});
