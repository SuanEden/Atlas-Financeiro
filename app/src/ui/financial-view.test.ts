import { describe, expect, it } from 'vitest';
import { eventStatusLabel, financialMonthPeriod } from './financial-view';
import { serializeMonthlyRecurrenceRule } from '../domain';
import { calculateCashTotals } from '../domain';

describe('período mensal do dashboard', () => {
  it.each([
    ['2026-02-12', '2026-02-28'], ['2028-02-29', '2028-02-29'],
    ['2100-02-01', '2100-02-28'], ['2000-02-01', '2000-02-29'],
    ['2026-04-30', '2026-04-30'], ['2026-12-31', '2026-12-31'],
  ])('aceita o mês de %s sem inventar dias', (date, end) => {
    const period = financialMonthPeriod(date);
    expect(period).toEqual({ start: `${date.slice(0, 7)}-01`, end });
    expect(calculateCashTotals({ accounts: [], categories: [], events: [], settlements: [], postings: [] }, period).resultCents).toBe(0n);
  });
});


describe('rótulos financeiros', () => {
  const userId = '00000000-0000-4000-8000-000000000001';
  const accountId = '00000000-0000-4000-8000-000000000002';

  it('distingue obrigação pendente, previsão, salário bruto e regra recorrente', () => {
    const base = {
      id: '00000000-0000-4000-8000-000000000003', userId, source: 'manual' as const,
      amountCents: 100n, accountId, description: 'Despesa', competenceDate: '2026-10-30',
    };
    expect(eventStatusLabel({ ...base, kind: 'expense', status: 'planned', certainty: 'confirmed' })).toBe('Pendente');
    expect(eventStatusLabel({ ...base, kind: 'income', status: 'planned', certainty: 'estimated' })).toBe('Previsto');
    expect(eventStatusLabel({ ...base, kind: 'income', status: 'planned', certainty: 'confirmed', description: 'Salário bruto' })).toBe('Bruto · líquido não informado');
    expect(eventStatusLabel({
      ...base, kind: 'expense', status: 'planned', certainty: 'confirmed',
      recurrenceJson: serializeMonthlyRecurrenceRule({
        frequency: 'monthly', status: 'paused', startMonth: '2026-11', nextOccurrenceMonth: '2026-11',
        necessity: 'unknown', amountBasis: 'fixed', firstOccurrence: 'normal',
      }),
    })).toBe('Recorrência pausada');
  });
});
