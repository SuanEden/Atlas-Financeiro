import type { IsoDate } from './models';

export type RecurrenceNecessity = 'essential' | 'important' | 'optional' | 'unknown';

export interface MonthlyRecurrenceRule {
  frequency: 'monthly';
  status: 'active' | 'paused' | 'ended';
  startMonth: string;
  startDate?: IsoDate;
  nextOccurrenceMonth: string;
  dueDayOfMonth?: number;
  necessity: RecurrenceNecessity;
  amountBasis: 'fixed' | 'gross';
  firstOccurrence: 'normal' | 'prorated_unknown';
  firstOccurrenceMonth?: string;
}

function assertMonth(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new TypeError(`${label} deve usar AAAA-MM.`);
  }
}

export function validateMonthlyRecurrenceRule(value: unknown): asserts value is MonthlyRecurrenceRule {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError('Regra recorrente inválida.');
  const rule = value as Record<string, unknown>;
  const allowed = new Set(['frequency', 'status', 'startMonth', 'startDate', 'nextOccurrenceMonth', 'dueDayOfMonth', 'necessity', 'amountBasis', 'firstOccurrence', 'firstOccurrenceMonth']);
  if (Object.keys(rule).some((key) => !allowed.has(key))) throw new TypeError('A regra recorrente contém campos desconhecidos.');
  if (rule.frequency !== 'monthly') throw new TypeError('Somente recorrência mensal é suportada nesta etapa.');
  if (!['active', 'paused', 'ended'].includes(String(rule.status))) throw new TypeError('Status da recorrência inválido.');
  assertMonth(rule.startMonth, 'Início da recorrência');
  assertMonth(rule.nextOccurrenceMonth, 'Próxima ocorrência');
  if (rule.startDate !== undefined) {
    if (typeof rule.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rule.startDate)) throw new TypeError('Data de início inválida.');
    const date = new Date(`${rule.startDate}T12:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== rule.startDate) throw new TypeError('Data de início inválida.');
  }
  if (rule.dueDayOfMonth !== undefined && (!Number.isInteger(rule.dueDayOfMonth) || Number(rule.dueDayOfMonth) < 1 || Number(rule.dueDayOfMonth) > 31)) {
    throw new TypeError('Dia de vencimento deve estar entre 1 e 31.');
  }
  if (!['essential', 'important', 'optional', 'unknown'].includes(String(rule.necessity))) throw new TypeError('Necessidade da recorrência inválida.');
  if (!['fixed', 'gross'].includes(String(rule.amountBasis))) throw new TypeError('Base do valor recorrente inválida.');
  if (!['normal', 'prorated_unknown'].includes(String(rule.firstOccurrence))) throw new TypeError('Regra da primeira ocorrência inválida.');
  if (rule.firstOccurrenceMonth !== undefined) assertMonth(rule.firstOccurrenceMonth, 'Primeira competência');
  if (rule.firstOccurrence === 'prorated_unknown' && rule.firstOccurrenceMonth === undefined) throw new TypeError('Informe o mês da primeira ocorrência proporcional ainda desconhecida.');
  if (rule.startDate !== undefined && rule.startDate.slice(0, 7) !== rule.startMonth) throw new TypeError('A data exata deve pertencer ao mês inicial da regra.');
  if (String(rule.nextOccurrenceMonth) < String(rule.startMonth)) throw new TypeError('A próxima ocorrência não pode anteceder o início da regra.');
  if (rule.firstOccurrenceMonth !== undefined && String(rule.firstOccurrenceMonth) < String(rule.startMonth)) throw new TypeError('A primeira ocorrência não pode anteceder o início da regra.');
}

export function serializeMonthlyRecurrenceRule(rule: MonthlyRecurrenceRule): string {
  validateMonthlyRecurrenceRule(rule);
  return JSON.stringify({
    frequency: rule.frequency,
    status: rule.status,
    startMonth: rule.startMonth,
    ...(rule.startDate === undefined ? {} : { startDate: rule.startDate }),
    nextOccurrenceMonth: rule.nextOccurrenceMonth,
    ...(rule.dueDayOfMonth === undefined ? {} : { dueDayOfMonth: rule.dueDayOfMonth }),
    necessity: rule.necessity,
    amountBasis: rule.amountBasis,
    firstOccurrence: rule.firstOccurrence,
    ...(rule.firstOccurrenceMonth === undefined ? {} : { firstOccurrenceMonth: rule.firstOccurrenceMonth }),
  });
}

export function parseMonthlyRecurrenceRule(json: string | undefined): MonthlyRecurrenceRule | undefined {
  if (json === undefined) return undefined;
  if (typeof json !== 'string' || json.length > 2_000) throw new TypeError('Metadados da recorrência inválidos.');
  const value: unknown = JSON.parse(json);
  validateMonthlyRecurrenceRule(value);
  return value;
}

export function addMonths(month: string, count: number): string {
  assertMonth(month, 'Mês');
  if (!Number.isSafeInteger(count)) throw new TypeError('Intervalo de meses inválido.');
  const [yearText, monthText] = month.split('-');
  const absolute = Number(yearText) * 12 + Number(monthText) - 1 + count;
  const nextYear = Math.floor(absolute / 12);
  const nextMonth = absolute % 12 + 1;
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}`;
}

export function monthDistance(from: string, to: string): number {
  assertMonth(from, 'Mês inicial');
  assertMonth(to, 'Mês final');
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + tm - fm;
}
