import {
  assertEntryAmount,
  assertIsoDate,
  type Account,
  type Category,
  type FinancialDataset,
  type FinancialEvent,
  type PendingOperation,
  type PendingOperationKind,
  type Posting,
  type Settlement,
  parseMonthlyRecurrenceRule,
} from '../domain';
import type { FinancialAggregate } from '../persistence';
import { serializeOperationPayload } from '../serialization';

export interface CommandContext {
  userId: string;
  nextId: () => string;
  now: () => string;
  today: () => string;
}

export interface LocalCommand {
  aggregate: FinancialAggregate;
  operation: PendingOperation;
}

export interface CreateAccountInput {
  name: string;
  kind: Account['kind'];
  availability: Account['availability'];
  openingBalanceCents?: bigint;
  openingBalanceCertainty?: 'confirmed' | 'estimated';
  openingBalanceSource?: string;
  openingDate: string;
}

export interface AccountReconciliationInput {
  accountId: string;
  balanceCents: bigint;
  referenceDate: string;
  sourceDescription: string;
  certainty: 'confirmed' | 'estimated';
}

export interface CreateCategoryInput {
  name: string;
  kind: Category['kind'];
  parentId?: string;
}

export interface TransactionInput {
  kind: Extract<FinancialEvent['kind'], 'income' | 'expense' | 'transfer'>;
  amountCents: bigint;
  accountId: string;
  transferAccountId?: string;
  categoryId?: string;
  description: string;
  date: string;
  realized: boolean;
  estimated?: boolean;
  dueDate?: string;
  recurrenceJson?: string;
  recurrenceRuleId?: string;
  recurrenceMonth?: string;
}

export function createDefaultCommandContext(userId: string): CommandContext {
  return {
    userId,
    nextId: () => crypto.randomUUID().toLowerCase(),
    now: () => new Date().toISOString(),
    today: () => financialToday(),
  };
}

export function createAccountCommand(input: CreateAccountInput, context: CommandContext): LocalCommand {
  assertIsoDate(input.openingDate);
  const account: Account = {
    id: context.nextId(),
    userId: context.userId,
    name: input.name.trim(),
    kind: input.kind,
    availability: input.kind === 'transport' ? 'restricted' : input.availability,
  };
  const aggregate: FinancialAggregate = { accounts: [account] };
  const openingBalance = input.openingBalanceCents ?? 0n;
  if (input.openingBalanceCents !== undefined) {
    if (openingBalance !== 0n) assertEntryAmount(openingBalance < 0n ? -openingBalance : openingBalance);
    const event: FinancialEvent = {
      id: context.nextId(),
      userId: context.userId,
      kind: 'adjustment',
      source: 'opening_balance',
      status: input.openingBalanceCertainty === 'estimated' ? 'planned' : 'confirmed',
      certainty: input.openingBalanceCertainty ?? 'confirmed',
      amountCents: openingBalance < 0n ? -openingBalance : openingBalance,
      accountId: account.id,
      description: input.openingBalanceSource?.trim() ? 'Saldo inicial · Origem: ' + input.openingBalanceSource.trim() : 'Saldo inicial · Origem não informada',
      competenceDate: input.openingDate,
      adjustmentDirection: openingBalance < 0n ? 'decrease' : 'increase',
    };
    if (event.status === 'confirmed' && event.amountCents > 0n) Object.assign(aggregate, settledAggregate(event, context, input.openingDate));
  }
  return command('create_account', aggregate, context);
}

export function reconcileAccountCommand(dataset: FinancialDataset, input: AccountReconciliationInput, context: CommandContext): LocalCommand {
  const account = dataset.accounts.find((item) => item.id === input.accountId);
  if (!account) throw new TypeError('Conta não encontrada.');
  if (dataset.events.some((event) => event.accountId === input.accountId && event.source === 'opening_balance')) {
    throw new TypeError('Esta conta já possui um saldo inicial registrado. Use um ajuste para corrigir diferenças posteriores.');
  }
  assertIsoDate(input.referenceDate);
  if (typeof input.balanceCents !== 'bigint' || input.balanceCents > 99_999_999_999n || input.balanceCents < -99_999_999_999n) {
    throw new RangeError('O saldo deve estar dentro do limite permitido.');
  }
  if (input.sourceDescription.trim().length === 0) throw new TypeError('Informe a origem do saldo.');
  const amount = input.balanceCents < 0n ? -input.balanceCents : input.balanceCents;
  if (amount > 0n) assertEntryAmount(amount);
  const event: FinancialEvent = {
    id: context.nextId(), userId: context.userId, kind: 'adjustment', source: 'opening_balance',
    status: input.certainty === 'confirmed' ? 'confirmed' : 'planned', certainty: input.certainty,
    amountCents: amount, accountId: account.id,
    description: 'Saldo inicial ' + (input.certainty === 'confirmed' ? 'confirmado' : 'estimado') + ' · Origem: ' + input.sourceDescription.trim(),
    competenceDate: input.referenceDate, adjustmentDirection: input.balanceCents < 0n ? 'decrease' : 'increase',
  };
  const aggregate: FinancialAggregate = { events: [event] };
  if (event.status === 'confirmed' && amount > 0n) Object.assign(aggregate, settledAggregate(event, context, input.referenceDate));
  return command('record_event', aggregate, context);
}

export function createCategoryCommand(input: CreateCategoryInput, context: CommandContext): LocalCommand {
  const category: Category = {
    id: context.nextId(),
    userId: context.userId,
    name: input.name.trim(),
    kind: input.kind,
    ...(input.parentId === undefined ? {} : { parentId: input.parentId }),
  };
  return command('create_category', { categories: [category] }, context);
}

export function createTransactionCommand(input: TransactionInput, context: CommandContext): LocalCommand {
  return command('record_event', transactionAggregate(input, context), context);
}

export function reverseEventCommand(dataset: FinancialDataset, eventId: string, context: CommandContext): LocalCommand {
  const original = dataset.events.find((event) => event.id === eventId);
  if (!original) throw new TypeError('Lançamento não encontrado.');
  if (dataset.events.some((event) => event.reversesEventId === eventId || event.replacesEventId === eventId)) {
    throw new TypeError('O lançamento já foi estornado ou substituído.');
  }
  if (original.amountCents === 0n) throw new TypeError('O saldo inicial zero é um marco de conciliação e não possui contrapartida para estorno.');
  if (original.status !== 'confirmed') {
    const cancelled: FinancialEvent = {
      ...original,
      id: context.nextId(),
      status: 'cancelled',
      certainty: 'confirmed',
      description: `Cancelamento: ${original.description}`,
      competenceDate: context.today(),
      replacesEventId: original.id,
    };
    return command('reverse_event', { events: [cancelled] }, context);
  }
  ensureFullySettled(dataset, original);
  return command('reverse_event', reversalAggregate(original, context), context);
}

export function replaceEventCommand(dataset: FinancialDataset, eventId: string, input: TransactionInput, context: CommandContext): LocalCommand {
  const original = dataset.events.find((event) => event.id === eventId);
  if (!original) throw new TypeError('Lançamento não encontrado.');
  if (original.reversesEventId !== undefined || dataset.events.some((event) => event.reversesEventId === eventId || event.replacesEventId === eventId)) {
    throw new TypeError('Somente o lançamento ativo mais recente pode ser editado.');
  }
  if (original.amountCents === 0n) throw new TypeError('O saldo inicial zero é um marco de conciliação; use um ajuste posterior para corrigir diferenças.');
  const replacement = transactionAggregate(input, context, original.id);
  const aggregate = original.status === 'confirmed'
    ? mergeAggregates(reversalAggregate(original, context), replacement)
    : replacement;
  if (original.status === 'confirmed') ensureFullySettled(dataset, original);
  return command('replace_event', aggregate, context);
}

function transactionAggregate(input: TransactionInput, context: CommandContext, replacesEventId?: string): FinancialAggregate {
  assertEntryAmount(input.amountCents);
  assertIsoDate(input.date);
  if (input.dueDate !== undefined) assertIsoDate(input.dueDate);
  if (input.recurrenceJson !== undefined) {
    parseMonthlyRecurrenceRule(input.recurrenceJson);
    if (input.realized || input.kind === 'transfer' || input.recurrenceRuleId !== undefined) throw new TypeError('Uma regra recorrente deve ser uma receita ou despesa prevista.');
  }
  if (input.recurrenceRuleId !== undefined && (input.recurrenceMonth === undefined || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.recurrenceMonth))) {
    throw new TypeError('Vincule a ocorrência a uma regra e competência mensal válidas.');
  }
  const description = input.description.trim() || defaultDescription(input.kind);
  const event: FinancialEvent = {
    id: context.nextId(),
    userId: context.userId,
    kind: input.kind,
    source: 'manual',
    status: input.realized ? 'confirmed' : 'planned',
    certainty: input.realized || input.estimated !== true ? 'confirmed' : 'estimated',
    amountCents: input.amountCents,
    accountId: input.accountId,
    description,
    competenceDate: input.date,
    ...(input.dueDate === undefined ? {} : { dueDate: input.dueDate }),
    ...(input.recurrenceJson === undefined ? {} : { recurrenceJson: input.recurrenceJson }),
    ...(input.recurrenceRuleId === undefined ? {} : { recurrenceRuleId: input.recurrenceRuleId, recurrenceMonth: input.recurrenceMonth }),
    ...(input.transferAccountId === undefined ? {} : { transferAccountId: input.transferAccountId }),
    ...(input.categoryId === undefined ? {} : { categoryId: input.categoryId }),
    ...(replacesEventId === undefined ? {} : { replacesEventId }),
  };
  return input.realized ? settledAggregate(event, context, input.date) : { events: [event] };
}

function reversalAggregate(original: FinancialEvent, context: CommandContext): FinancialAggregate {
  const date = context.today();
  const reversal: FinancialEvent = {
    ...original,
    id: context.nextId(),
    source: 'manual',
    status: 'confirmed',
    certainty: 'confirmed',
    description: `Estorno: ${original.description}`,
    competenceDate: date,
    reversesEventId: original.id,
  };
  delete reversal.replacesEventId;
  return settledAggregate(reversal, context, date);
}

function settledAggregate(event: FinancialEvent, context: CommandContext, date: string): FinancialAggregate {
  const settlement: Settlement = {
    id: context.nextId(),
    userId: context.userId,
    eventId: event.id,
    amountCents: event.amountCents,
    paymentDate: date,
    settlementDate: date,
  };
  const postings: Posting[] = [];
  const reverse = event.reversesEventId === undefined ? 1n : -1n;
  if (event.kind === 'transfer') {
    if (event.transferAccountId === undefined) throw new TypeError('Transferência exige conta de destino.');
    postings.push(
      { id: context.nextId(), userId: context.userId, settlementId: settlement.id, accountId: event.accountId, amountCents: -event.amountCents * reverse },
      { id: context.nextId(), userId: context.userId, settlementId: settlement.id, accountId: event.transferAccountId, amountCents: event.amountCents * reverse },
    );
  } else {
    const positive = event.kind === 'income' || (event.kind === 'adjustment' && event.adjustmentDirection === 'increase');
    const natural = positive ? event.amountCents : -event.amountCents;
    postings.push({
      id: context.nextId(),
      userId: context.userId,
      settlementId: settlement.id,
      accountId: event.accountId,
      amountCents: natural * reverse,
    });
  }
  return { events: [event], settlements: [settlement], postings };
}

function command(kind: PendingOperationKind, aggregate: FinancialAggregate, context: CommandContext): LocalCommand {
  const operation: PendingOperation = {
    id: context.nextId(),
    userId: context.userId,
    kind,
    createdAt: context.now(),
    payloadJson: serializeOperationPayload(aggregate, context.userId),
  };
  return { aggregate, operation };
}

function mergeAggregates(...aggregates: FinancialAggregate[]): FinancialAggregate {
  return {
    accounts: aggregates.flatMap((aggregate) => aggregate.accounts ?? []),
    categories: aggregates.flatMap((aggregate) => aggregate.categories ?? []),
    events: aggregates.flatMap((aggregate) => aggregate.events ?? []),
    settlements: aggregates.flatMap((aggregate) => aggregate.settlements ?? []),
    postings: aggregates.flatMap((aggregate) => aggregate.postings ?? []),
  };
}

function ensureFullySettled(dataset: FinancialDataset, event: FinancialEvent): void {
  const total = dataset.settlements
    .filter((settlement) => settlement.eventId === event.id)
    .reduce((sum, settlement) => sum + settlement.amountCents, 0n);
  if (total !== event.amountCents) throw new TypeError('Somente lançamentos integralmente liquidados podem ser estornados nesta etapa.');
}

function defaultDescription(kind: TransactionInput['kind']): string {
  if (kind === 'income') return 'Receita';
  if (kind === 'expense') return 'Despesa';
  return 'Transferência';
}

export function financialToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

