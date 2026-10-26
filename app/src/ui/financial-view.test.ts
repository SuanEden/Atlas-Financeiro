import { describe, expect, it } from 'vitest';
import { financialMonthPeriod } from './financial-view';
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
