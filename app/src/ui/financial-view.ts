import type { Account, Category, FinancialDataset, FinancialEvent } from '../domain';
import { assertIsoDate, parseMonthlyRecurrenceRule, type DatePeriod } from '../domain';

export function financialMonthPeriod(date: string): DatePeriod {
  assertIsoDate(date);
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const days = month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31;
  return { start: `${date.slice(0, 7)}-01`, end: `${date.slice(0, 7)}-${days}` };
}

export const accountKindLabels: Record<Account['kind'], string> = {
  checking: 'Conta-corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  digital: 'Conta digital',
  transport: 'Transporte',
  investment: 'Investimento',
  other: 'Outra conta',
};

export const availabilityLabels: Record<Account['availability'], string> = {
  free: 'Disponível',
  reserved: 'Reservado',
  restricted: 'Restrito',
};

export function formatFinancialDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function eventLabel(event: FinancialEvent): string {
  if (event.recurrenceJson !== undefined) return 'Regra recorrente';
  if (event.reversesEventId !== undefined) return 'Estorno';
  if (event.kind === 'income') return 'Receita';
  if (event.kind === 'expense') return 'Despesa';
  if (event.kind === 'transfer') return 'Transferência';
  return event.source === 'opening_balance' ? 'Saldo inicial' : 'Ajuste';
}

export function eventAmountSign(event: FinancialEvent): '' | '+' | '−' {
  const reversed = event.reversesEventId !== undefined;
  if (event.kind === 'income') return reversed ? '−' : '+';
  if (event.kind === 'expense') return reversed ? '+' : '−';
  if (event.kind === 'adjustment') {
    const positive = event.adjustmentDirection === 'increase';
    return positive !== reversed ? '+' : '−';
  }
  return '';
}

export function activeEventIds(dataset: FinancialDataset): Set<string> {
  const superseded = new Set<string>();
  for (const event of dataset.events) {
    if (event.reversesEventId !== undefined) superseded.add(event.reversesEventId);
    if (event.replacesEventId !== undefined) superseded.add(event.replacesEventId);
  }
  return new Set(dataset.events.filter((event) => event.status !== 'cancelled' && event.reversesEventId === undefined && !superseded.has(event.id)).map((event) => event.id));
}

export function eventStatusLabel(event: FinancialEvent, category?: Category): string {
  if (event.recurrenceJson !== undefined) {
    const rule = parseMonthlyRecurrenceRule(event.recurrenceJson);
    return rule?.status === 'active' ? 'Recorrência ativa' : rule?.status === 'paused' ? 'Recorrência pausada' : 'Recorrência encerrada';
  }
  if (event.status === 'confirmed') return 'Realizado';
  if (event.status === 'cancelled') return 'Cancelado';
  if (event.kind === 'expense' && (event.certainty === 'confirmed' || category?.name.trim().toLocaleLowerCase('pt-BR') === 'cartão de crédito')) return 'Pendente';
  if (event.kind === 'income' && /sal[aá]rio.*bruto|bruto.*sal[aá]rio/i.test(event.description)) return 'Bruto · líquido não informado';
  return 'Previsto';
}

export function isRecurringTemplate(event: FinancialEvent): boolean {
  return event.recurrenceJson !== undefined;
}


/** Read-only grouping for presentation; financial entries remain immutable. */
export interface MovementHistoryGroup {
  current: FinancialEvent;
  history: FinancialEvent[];
  cancelled: boolean;
}

export function groupMovementHistory(events: readonly FinancialEvent[]): MovementHistoryGroup[] {
  const byId = new Map(events.map(event => [event.id, event]));
  const parent = new Map(events.map(event => [event.id, event.id]));
  const root = (id: string): string => {
    const previous = parent.get(id)!;
    if (previous === id) return id;
    const answer = root(previous);
    parent.set(id, answer);
    return answer;
  };
  const unite = (left: string, right: string) => {
    const a = root(left), b = root(right);
    if (a !== b) parent.set(a, b);
  };
  for (const event of events) {
    for (const reference of [event.replacesEventId, event.reversesEventId]) {
      if (reference && byId.has(reference)) unite(event.id, reference);
    }
  }
  const groups = new Map<string, FinancialEvent[]>();
  for (const event of events) {
    const key = root(event.id);
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }
  const active = activeEventIds({events: [...events]} as FinancialDataset);
  return [...groups.values()].map(group => {
    // The current user-facing row is the most recent active version, never its technical reversal.
    // Reversed/cancelled entries have no active version: keep the original visible as cancelled.
    const current = [...group].reverse().find(event => active.has(event.id))
      ?? [...group].reverse().find(event => event.reversesEventId === undefined && event.status === 'cancelled')
      ?? [...group].reverse().find(event => event.reversesEventId === undefined && event.replacesEventId !== undefined)
      ?? group.find(event => event.reversesEventId === undefined)
      ?? group[0]!;
    const cancelled = !active.has(current.id);
    return {
      current,
      history: group.filter(event => event.id !== current.id),
      cancelled,
    };
  }).sort((a, b) => b.current.competenceDate.localeCompare(a.current.competenceDate));
}
