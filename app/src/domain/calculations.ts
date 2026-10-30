import { sumCents } from './money';
import type { AvailabilityBalances, DatePeriod, FinancialDataset, FinancialTotals, IsoDate } from './models';
import { assertIsoDate } from './validation';
import { addMonths, parseMonthlyRecurrenceRule } from './recurrence';

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


export interface FinancialForecastItem {
  eventId: string;
  month: string;
  date?: IsoDate;
  kind: 'income' | 'expense';
  amountCents: MoneyCents;
  description: string;
  source: 'planned' | 'recurrence';
  amountBasis: 'cash' | 'gross';
  obligation: boolean;
}

export interface FinancialForecast {
  plannedIncomeCents: MoneyCents;
  plannedExpenseCents: MoneyCents;
  obligationCents: MoneyCents;
  recurringExpenseCents: MoneyCents;
  recurringGrossIncomeCents: MoneyCents;
  projectedCashChangeCents: MoneyCents;
  items: FinancialForecastItem[];
}

/** Planned items and recurring rules are forecasts only; none creates a settlement. */
export function calculateFinancialForecast(dataset: FinancialDataset, startMonth: string, monthCount = 6): FinancialForecast {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)) throw new TypeError('O período deve usar AAAA-MM.');
  if (!Number.isSafeInteger(monthCount) || monthCount < 1 || monthCount > 24) throw new RangeError('O horizonte deve conter de 1 a 24 meses.');
  const endMonth = addMonths(startMonth, monthCount - 1);
  const covered = new Set(dataset.events.filter((event) => event.recurrenceRuleId !== undefined && event.recurrenceMonth !== undefined)
    .map((event) => `${event.recurrenceRuleId}:${event.recurrenceMonth}`));
  const result: FinancialForecast = {
    plannedIncomeCents: 0n,
    plannedExpenseCents: 0n,
    obligationCents: 0n,
    recurringExpenseCents: 0n,
    recurringGrossIncomeCents: 0n,
    projectedCashChangeCents: 0n,
    items: [],
  };
  for (const event of dataset.events) {
    if (event.status !== 'planned' || event.recurrenceJson !== undefined) continue;
    const month = event.competenceDate.slice(0, 7);
    if (month < startMonth || month > endMonth || (event.kind !== 'income' && event.kind !== 'expense')) continue;
    const obligation = event.kind === 'expense' && event.certainty === 'confirmed';
    if (event.kind === 'income') result.plannedIncomeCents += event.amountCents;
    else if (obligation) result.obligationCents += event.amountCents;
    else result.plannedExpenseCents += event.amountCents;
    result.items.push({
      eventId: event.id, month, date: event.dueDate ?? event.competenceDate, kind: event.kind,
      amountCents: event.amountCents, description: event.description, source: 'planned',
      amountBasis: 'cash', obligation,
    });
  }
  for (const ruleEvent of dataset.events) {
    if (ruleEvent.status !== 'planned' || ruleEvent.recurrenceJson === undefined) continue;
    const rule = parseMonthlyRecurrenceRule(ruleEvent.recurrenceJson);
    if (rule?.status !== 'active' || (ruleEvent.kind !== 'income' && ruleEvent.kind !== 'expense')) continue;
    const firstMonth = rule.startMonth > rule.nextOccurrenceMonth ? rule.startMonth : rule.nextOccurrenceMonth;
    for (let offset = 0; offset < monthCount; offset += 1) {
      const month = addMonths(startMonth, offset);
      if (month < firstMonth || month < rule.startMonth || covered.has(`${ruleEvent.id}:${month}`)) continue;
      if (rule.firstOccurrence === 'prorated_unknown' && rule.firstOccurrenceMonth === month) continue;
      const date = rule.dueDayOfMonth === undefined ? undefined : recurrenceDate(month, rule.dueDayOfMonth);
      const item: FinancialForecastItem = {
        eventId: ruleEvent.id, month, ...(date === undefined ? {} : { date }),
        kind: ruleEvent.kind, amountCents: ruleEvent.amountCents, description: ruleEvent.description,
        source: 'recurrence', amountBasis: rule.amountBasis === 'gross' ? 'gross' : 'cash', obligation: false,
      };
      result.items.push(item);
      if (ruleEvent.kind === 'income') {
        if (rule.amountBasis === 'gross') result.recurringGrossIncomeCents += ruleEvent.amountCents;
        else result.plannedIncomeCents += ruleEvent.amountCents;
      } else {
        result.plannedExpenseCents += ruleEvent.amountCents;
        result.recurringExpenseCents += ruleEvent.amountCents;
      }
    }
  }
  result.items.sort((a, b) => a.month.localeCompare(b.month) || (a.date ?? '').localeCompare(b.date ?? '') || a.description.localeCompare(b.description));
  result.projectedCashChangeCents = result.plannedIncomeCents - result.plannedExpenseCents - result.obligationCents;
  return result;
}

/** An account is not a confirmed balance until the user records its opening position. */
export function hasReconciledOpeningBalance(dataset: FinancialDataset, accountId: string): boolean {
  return dataset.events.some((event) => event.accountId === accountId && event.source === 'opening_balance' && event.status === 'confirmed' && event.certainty === 'confirmed');
}

function recurrenceDate(month: string, day: number): IsoDate {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}
