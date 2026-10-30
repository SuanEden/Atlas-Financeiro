import { describe, expect, it } from 'vitest';
import { calculateAccountBalance, calculateAccrualTotals, calculateAvailabilityBalances, calculateCashTotals, calculateFinancialForecast, hasReconciledOpeningBalance } from './calculations';
import type { FinancialDataset } from './models';
import { assertEntityId, assertFinancialDataset, assertIsoDate } from './validation';
import { serializeMonthlyRecurrenceRule } from './recurrence';

const uuid = (number: number): string => `00000000-0000-4000-8000-${number.toString().padStart(12, '0')}`;
const userId = uuid(1);

function example(): FinancialDataset {
  return {
    accounts: [
      { id: uuid(10), userId, name: 'Carteira de teste', kind: 'cash', availability: 'free' },
      { id: uuid(11), userId, name: 'Reserva de teste', kind: 'savings', availability: 'reserved' },
      { id: uuid(12), userId, name: 'Transporte de teste', kind: 'transport', availability: 'restricted' },
    ],
    categories: [{ id: uuid(20), userId, name: 'Despesa de teste', kind: 'expense' }],
    events: [
      { id: uuid(30), userId, kind: 'income', source: 'manual', status: 'confirmed', certainty: 'confirmed', amountCents: 5_000n, accountId: uuid(10), description: 'Entrada de teste', competenceDate: '2026-01-15' },
      { id: uuid(31), userId, kind: 'expense', source: 'manual', status: 'confirmed', certainty: 'confirmed', amountCents: 1_800n, accountId: uuid(10), categoryId: uuid(20), description: 'Saída de teste', competenceDate: '2026-01-31', dueDate: '2026-02-10' },
      { id: uuid(32), userId, kind: 'transfer', source: 'manual', status: 'confirmed', certainty: 'confirmed', amountCents: 500n, accountId: uuid(10), transferAccountId: uuid(11), description: 'Reserva de teste', competenceDate: '2026-01-20' },
      { id: uuid(33), userId, kind: 'adjustment', source: 'opening_balance', status: 'confirmed', certainty: 'confirmed', amountCents: 1_000n, accountId: uuid(12), adjustmentDirection: 'increase', description: 'Saldo inicial de teste', competenceDate: '2026-01-01' },
      { id: uuid(34), userId, kind: 'income', source: 'manual', status: 'planned', certainty: 'estimated', amountCents: 90_000n, accountId: uuid(10), description: 'Previsão de teste', competenceDate: '2026-01-30' },
    ],
    settlements: [
      { id: uuid(40), userId, eventId: uuid(30), amountCents: 5_000n, paymentDate: '2026-01-15', settlementDate: '2026-01-15' },
      { id: uuid(41), userId, eventId: uuid(31), amountCents: 1_800n, paymentDate: '2026-01-31', settlementDate: '2026-02-02' },
      { id: uuid(42), userId, eventId: uuid(32), amountCents: 500n, paymentDate: '2026-01-20', settlementDate: '2026-01-20' },
      { id: uuid(43), userId, eventId: uuid(33), amountCents: 1_000n, paymentDate: '2026-01-01', settlementDate: '2026-01-01' },
    ],
    postings: [
      { id: uuid(50), userId, settlementId: uuid(40), accountId: uuid(10), amountCents: 5_000n },
      { id: uuid(51), userId, settlementId: uuid(41), accountId: uuid(10), amountCents: -1_800n },
      { id: uuid(52), userId, settlementId: uuid(42), accountId: uuid(10), amountCents: -500n },
      { id: uuid(53), userId, settlementId: uuid(42), accountId: uuid(11), amountCents: 500n },
      { id: uuid(54), userId, settlementId: uuid(43), accountId: uuid(12), amountCents: 1_000n },
    ],
  };
}

describe('agregados e cálculos financeiros', () => {
  it('aceita o agregado consistente e mantém dinheiro livre, reservado e restrito separados', () => {
    const data = example();
    expect(() => assertFinancialDataset(data, userId)).not.toThrow();
    expect(calculateAvailabilityBalances(data)).toEqual({ freeCents: 2_700n, reservedCents: 500n, restrictedCents: 1_000n, totalCents: 4_200n });
    expect(calculateAccountBalance(data, uuid(10), '2026-01-31')).toBe(4_500n);
  });

  it('separa competência, pagamento e liquidação na virada do mês', () => {
    const data = example();
    const january = { start: '2026-01-01', end: '2026-01-31' };
    const february = { start: '2026-02-01', end: '2026-02-28' };
    expect(calculateCashTotals(data, january)).toEqual({ incomeCents: 5_000n, expenseCents: 0n, resultCents: 5_000n });
    expect(calculateAccrualTotals(data, january)).toEqual({ incomeCents: 5_000n, expenseCents: 1_800n, resultCents: 3_200n });
    expect(calculateCashTotals(data, february)).toEqual({ incomeCents: 0n, expenseCents: 1_800n, resultCents: -1_800n });
    expect(calculateAccrualTotals(data, february)).toEqual({ incomeCents: 0n, expenseCents: 0n, resultCents: 0n });
  });

  it('não transforma previsão em saldo ou receita realizada', () => {
    const data = example();
    const before = calculateAccountBalance(data, uuid(10));
    data.events.push({ id: uuid(35), userId, kind: 'income', source: 'manual', status: 'planned', certainty: 'confirmed', amountCents: 100_000n, accountId: uuid(10), description: 'Outra previsão de teste', competenceDate: '2026-01-31' });
    assertFinancialDataset(data, userId);
    expect(calculateAccountBalance(data, uuid(10))).toBe(before);
    expect(calculateAccrualTotals(data, { start: '2026-01-01', end: '2026-01-31' }).incomeCents).toBe(5_000n);
  });

  it('trata saldo inicial como ajuste de caixa, nunca como renda', () => {
    const data = example();
    const january = { start: '2026-01-01', end: '2026-01-31' };
    expect(calculateAccountBalance(data, uuid(12))).toBe(1_000n);
    expect(calculateCashTotals(data, january).incomeCents).toBe(5_000n);
    expect(calculateAccrualTotals(data, january).incomeCents).toBe(5_000n);
  });

  it('aceita liquidação parcial sem reconhecer o total como pago', () => {
    const data = example();
    data.settlements[1]!.amountCents = 600n;
    data.postings[1]!.amountCents = -600n;
    assertFinancialDataset(data, userId);
    expect(calculateCashTotals(data, { start: '2026-02-01', end: '2026-02-28' }).expenseCents).toBe(600n);
    expect(calculateAccrualTotals(data, { start: '2026-01-01', end: '2026-01-31' }).expenseCents).toBe(1_800n);
  });

  it('exige as duas pernas da transferência e conserva o total entre contas', () => {
    const data = example();
    const withTransfer = calculateAvailabilityBalances(data).totalCents;
    data.postings = data.postings.filter((posting) => posting.settlementId !== uuid(42));
    data.settlements = data.settlements.filter((settlement) => settlement.id !== uuid(42));
    data.events = data.events.filter((event) => event.id !== uuid(32));
    assertFinancialDataset(data, userId);
    expect(calculateAvailabilityBalances(data).totalCents).toBe(withTransfer);
    const invalid = example();
    invalid.postings = invalid.postings.filter((posting) => posting.id !== uuid(53));
    expect(() => assertFinancialDataset(invalid, userId)).toThrow(/duas contrapartidas/);
  });

  it('permite saldo negativo sem arredondar nem mascarar o déficit', () => {
    const data = example();
    data.events[0]!.amountCents = 100n;
    data.settlements[0]!.amountCents = 100n;
    data.postings[0]!.amountCents = 100n;
    assertFinancialDataset(data, userId);
    expect(calculateAccountBalance(data, uuid(10))).toBe(-2_200n);
  });

  it('retorna zero em períodos sem movimentações e rejeita período invertido', () => {
    expect(calculateCashTotals(example(), { start: '2026-03-01', end: '2026-03-31' })).toEqual({ incomeCents: 0n, expenseCents: 0n, resultCents: 0n });
    expect(() => calculateAccrualTotals(example(), { start: '2026-02-01', end: '2026-01-01' })).toThrow();
  });
});

describe('prevenção de inconsistências', () => {
  it.each([
    ['proprietário diferente', (data: FinancialDataset) => { data.accounts[0]!.userId = uuid(2); }],
    ['identificador repetido', (data: FinancialDataset) => { data.accounts.push({ ...data.accounts[0]! }); }],
    ['conta inexistente', (data: FinancialDataset) => { data.events[0]!.accountId = uuid(999); }],
    ['categoria incompatível', (data: FinancialDataset) => { data.categories[0]!.kind = 'income'; }],
    ['transporte como dinheiro livre', (data: FinancialDataset) => { data.accounts[2]!.availability = 'free'; }],
    ['transferência para a mesma conta', (data: FinancialDataset) => { data.events[2]!.transferAccountId = uuid(10); }],
    ['valor de contrapartida divergente', (data: FinancialDataset) => { data.postings[3]!.amountCents = 499n; }],
    ['sinal de despesa incorreto', (data: FinancialDataset) => { data.postings[1]!.amountCents = 1_800n; }],
    ['liquidação acima da obrigação', (data: FinancialDataset) => { data.settlements[1]!.amountCents = 1_801n; }],
    ['liquidação anterior ao pagamento', (data: FinancialDataset) => { data.settlements[1]!.settlementDate = '2026-01-30'; }],
    ['previsão liquidada', (data: FinancialDataset) => { data.settlements[0]!.eventId = uuid(34); }],
    ['estimativa confirmada', (data: FinancialDataset) => { data.events[0]!.certainty = 'estimated'; }],
    ['saldo inicial classificado como renda', (data: FinancialDataset) => { data.events[0]!.source = 'opening_balance'; }],
    ['cancelamento que apagaria caixa realizado', (data: FinancialDataset) => { data.events[0]!.status = 'cancelled'; }],
    ['contrapartida órfã', (data: FinancialDataset) => { data.postings[0]!.settlementId = uuid(999); }],
    ['ciclo de categorias', (data: FinancialDataset) => { data.categories[0]!.parentId = uuid(20); }],
  ])('rejeita %s', (_, mutate) => {
    const data = example();
    mutate(data);
    expect(() => assertFinancialDataset(data, userId)).toThrow();
  });

  it('rejeita centavos numéricos recebidos por entrada externa', () => {
    const data = example();
    (data.events[0] as unknown as { amountCents: unknown }).amountCents = 50;
    expect(() => assertFinancialDataset(data, userId)).toThrow();
  });

  it('valida UUIDs canônicos para corresponder às chaves PostgreSQL', () => {
    expect(() => assertEntityId('00000000-0000-4000-8000-000000000001')).not.toThrow();
    expect(() => assertEntityId('00000000-0000-4000-8000-00000000000A')).toThrow();
    expect(() => assertEntityId('identificador-local')).toThrow();
  });

  it('valida datas de calendário sem conversão de fuso horário', () => {
    expect(() => assertIsoDate('2028-02-29')).not.toThrow();
    for (const invalid of ['2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '24/10/2026', '2026-01-01T00:00:00Z']) {
      expect(() => assertIsoDate(invalid)).toThrow();
    }
  });
});


describe('previsões financeiras e recorrências', () => {
  it('separa obrigações, previsões, recorrências e salário bruto sem inflar caixa projetado', () => {
    const data = example();
    const spotifyId = uuid(60);
    const salaryId = uuid(61);
    data.events.push(
      {
        id: spotifyId, userId, kind: 'expense', source: 'manual', status: 'planned', certainty: 'confirmed',
        amountCents: 682n, accountId: uuid(10), categoryId: uuid(20), description: 'Spotify',
        competenceDate: '2026-11-01',
        recurrenceJson: serializeMonthlyRecurrenceRule({
          frequency: 'monthly', status: 'active', startMonth: '2026-11', nextOccurrenceMonth: '2026-11',
          necessity: 'unknown', amountBasis: 'fixed', firstOccurrence: 'normal',
        }),
      },
      {
        id: salaryId, userId, kind: 'income', source: 'manual', status: 'planned', certainty: 'confirmed',
        amountCents: 162_100n, accountId: uuid(10), description: 'Salário bruto Lanlink',
        competenceDate: '2026-10-21',
        recurrenceJson: serializeMonthlyRecurrenceRule({
          frequency: 'monthly', status: 'active', startMonth: '2026-10', startDate: '2026-10-21',
          nextOccurrenceMonth: '2026-11', necessity: 'unknown', amountBasis: 'gross',
          firstOccurrence: 'prorated_unknown', firstOccurrenceMonth: '2026-10',
        }),
      },
      {
        id: uuid(62), userId, kind: 'expense', source: 'manual', status: 'planned', certainty: 'confirmed',
        amountCents: 22_194n, accountId: uuid(10), categoryId: uuid(20), description: 'Fatura do cartão',
        competenceDate: '2026-11-01',
      },
      {
        id: uuid(63), userId, kind: 'income', source: 'manual', status: 'planned', certainty: 'estimated',
        amountCents: 40_267n, accountId: uuid(10), description: 'Recebimento ainda não confirmado',
        competenceDate: '2026-10-28',
      },
    );
    assertFinancialDataset(data, userId);
    const forecast = calculateFinancialForecast(data, '2026-11', 2);
    expect(forecast.plannedIncomeCents).toBe(0n);
    expect(forecast.plannedExpenseCents).toBe(1_364n);
    expect(forecast.recurringExpenseCents).toBe(1_364n);
    expect(forecast.obligationCents).toBe(22_194n);
    expect(forecast.recurringGrossIncomeCents).toBe(324_200n);
    expect(forecast.grossIncomeReferenceCents).toBe(0n);
    expect(forecast.projectedCashChangeCents).toBe(-23_558n);
    expect(forecast.items.filter((item) => item.source === 'recurrence' && item.kind === 'expense').every((item) => item.date === undefined)).toBe(true);
  });

  it('não duplica uma competência recorrente já vinculada a um lançamento', () => {
    const data = example();
    const ruleId = uuid(70);
    data.events.push({
      id: ruleId, userId, kind: 'expense', source: 'manual', status: 'planned', certainty: 'confirmed',
      amountCents: 1_300n, accountId: uuid(10), categoryId: uuid(20), description: 'Internet',
      competenceDate: '2026-11-01',
      recurrenceJson: serializeMonthlyRecurrenceRule({
        frequency: 'monthly', status: 'active', startMonth: '2026-11', nextOccurrenceMonth: '2026-11',
        necessity: 'unknown', amountBasis: 'fixed', firstOccurrence: 'normal',
      }),
    });
    data.events.push({
      id: uuid(71), userId, kind: 'expense', source: 'manual', status: 'planned', certainty: 'confirmed',
      amountCents: 1_300n, accountId: uuid(10), categoryId: uuid(20), description: 'Internet · cobrança de novembro',
      competenceDate: '2026-11-05', recurrenceRuleId: ruleId, recurrenceMonth: '2026-11',
    });
    assertFinancialDataset(data, userId);
    const forecast = calculateFinancialForecast(data, '2026-11', 2);
    expect(forecast.plannedExpenseCents).toBe(1_300n);
    expect(forecast.obligationCents).toBe(1_300n);
    expect(forecast.items.filter((item) => item.eventId === ruleId)).toHaveLength(1);
    expect(forecast.items.filter((item) => item.eventId === uuid(71))).toHaveLength(1);
  });

  it('só considera saldo inicial conciliado quando a referência está confirmada e ativa', () => {
    const data = example();
    expect(hasReconciledOpeningBalance(data, uuid(12))).toBe(true);
    expect(hasReconciledOpeningBalance(data, uuid(10))).toBe(false);
  });
});


describe('proteção de valores ainda não conciliados', () => {
  it('mantém salário bruto fora da previsão de caixa enquanto o líquido não foi informado', () => {
    const data = example();
    data.events.push({
      id: uuid(80), userId, kind: 'income', source: 'manual', status: 'planned', certainty: 'confirmed',
      amountCents: 162_100n, accountId: uuid(10), description: 'Salário bruto Lanlink',
      competenceDate: '2026-10-21',
    });
    assertFinancialDataset(data, userId);
    const forecast = calculateFinancialForecast(data, '2026-10', 1);
    expect(forecast.plannedIncomeCents).toBe(0n);
    expect(forecast.grossIncomeReferenceCents).toBe(162_100n);
    expect(forecast.projectedCashChangeCents).toBe(0n);
  });

  it('classifica fatura de cartão como obrigação e oculta vencimento provisório', () => {
    const data = example();
    data.categories.push({ id: uuid(21), userId, name: 'Cartão de crédito', kind: 'expense' });
    data.events.push({
      id: uuid(81), userId, kind: 'expense', source: 'manual', status: 'planned', certainty: 'estimated',
      amountCents: 22_194n, accountId: uuid(10), categoryId: uuid(21), description: 'Fatura atualizada',
      competenceDate: '2026-11-01', dueDate: '2026-11-11',
    });
    assertFinancialDataset(data, userId);
    const forecast = calculateFinancialForecast(data, '2026-11', 1);
    expect(forecast.obligationCents).toBe(22_194n);
    expect(forecast.items.find((item) => item.eventId === uuid(81))?.date).toBeUndefined();
  });
});
