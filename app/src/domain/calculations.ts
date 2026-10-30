import { sumCents } from './money';
import type { AvailabilityBalances, DatePeriod, FinancialDataset, FinancialTotals, IsoDate } from './models';
import { assertIsoDate } from './validation';

function assertPeriod(period: DatePeriod): void {
  assertIsoDate(period.start);
  assertIsoDate(period.end);
  if (period.start > period.end) throw new RangeError('O início do período deve anteceder seu fim.');
}

function inPeriod(date: IsoDate, period: DatePeriod): boolean {
  return date >= period.start && date <= period.end;
}

/** Use a dataset validated at the persistence boundary. */
export function calculateAccountBalance(dataset: FinancialDataset, accountId: string, asOf?: IsoDate): bigint {
  if (!dataset.accounts.some((account) => account.id === accountId)) throw new TypeError('Conta inexistente.');
  if (asOf !== undefined) assertIsoDate(asOf);
  const settlements = new Map(dataset.settlements.map((settlement) => [settlement.id, settlement]));
  return sumCents(dataset.postings.filter((posting) => {
    const settlement = settlements.get(posting.settlementId);
    return posting.accountId === accountId && settlement !== undefined && (asOf === undefined || settlement.settlementDate <= asOf);
  }).map((posting) => posting.amountCents));
}

export function calculateAvailabilityBalances(dataset: FinancialDataset, asOf?: IsoDate): AvailabilityBalances {
  const balances: AvailabilityBalances = { freeCents: 0n, reservedCents: 0n, restrictedCents: 0n, totalCents: 0n };
  for (const account of dataset.accounts) {
    const balance = calculateAccountBalance(dataset, account.id, asOf);
    if (account.availability === 'free') balances.freeCents += balance;
    if (account.availability === 'reserved') balances.reservedCents += balance;
    if (account.availability === 'restricted') balances.restrictedCents += balance;
    balances.totalCents += balance;
  }
  return balances;
}

/** Cash income/expenses use settlement dates; transfers and adjustments are excluded. */
export function calculateCashTotals(dataset: FinancialDataset, period: DatePeriod): FinancialTotals {
  assertPeriod(period);
  const events = new Map(dataset.events.map((event) => [event.id, event]));
  let incomeCents = 0n;
  let expenseCents = 0n;
  for (const settlement of dataset.settlements) {
    if (!inPeriod(settlement.settlementDate, period)) continue;
    const event = events.get(settlement.eventId);
    const direction = event?.reversesEventId === undefined ? 1n : -1n;
    if (event?.kind === 'income') incomeCents += settlement.amountCents * direction;
    if (event?.kind === 'expense') expenseCents += settlement.amountCents * direction;
  }
  return { incomeCents, expenseCents, resultCents: incomeCents - expenseCents };
}

/** Confirmed events use competence dates, even before their effective settlement. */
export function calculateAccrualTotals(dataset: FinancialDataset, period: DatePeriod): FinancialTotals {
  assertPeriod(period);
  let incomeCents = 0n;
  let expenseCents = 0n;
  for (const event of dataset.events) {
    if (event.status !== 'confirmed' || event.certainty !== 'confirmed' || !inPeriod(event.competenceDate, period)) continue;
    const direction = event.reversesEventId === undefined ? 1n : -1n;
    if (event.kind === 'income') incomeCents += event.amountCents * direction;
    if (event.kind === 'expense') expenseCents += event.amountCents * direction;
  }
  return { incomeCents, expenseCents, resultCents: incomeCents - expenseCents };
}
