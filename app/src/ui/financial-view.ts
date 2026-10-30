import type { Account, FinancialDataset, FinancialEvent } from '../domain';
import { assertIsoDate, type DatePeriod } from '../domain';

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

export function eventStatusLabel(event: FinancialEvent): string {
  if (event.recurrenceJson !== undefined) return 'Regra recorrente';
  if (event.status === 'confirmed') return 'Realizado';
  if (event.status === 'cancelled') return 'Cancelado';
  if (event.kind === 'expense' && event.certainty === 'confirmed') return 'Pendente';
  return 'Previsto';
}

export function isRecurringTemplate(event: FinancialEvent): boolean {
  return event.recurrenceJson !== undefined;
}
