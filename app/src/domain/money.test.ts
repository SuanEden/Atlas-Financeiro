import { describe, expect, it } from 'vitest';
import { MAX_ENTRY_CENTS, assertEntryAmount, decodeCents, encodeCents, formatBRL, parseBRL, percentageCents, splitInstallments, sumCents } from './money';

describe('centavos exatos', () => {
  it.each([
    ['0', 0n], ['18,00', 1_800n], ['1.234,56', 123_456n], ['R$ 6,8', 680n],
    [' -R$ 10,05 ', -1_005n], ['99.999.999.999.999.999,99', 9_999_999_999_999_999_999n],
  ])('converte %s sem ponto flutuante', (input, expected) => {
    expect(parseBRL(input)).toBe(expected);
  });

  it.each(['1.23', '1,234', '1e3', 'NaN', '001,00', '+2,00', '1 234,56', '', 'R$'])('rejeita formato monetário ambíguo: %s', (input) => {
    expect(() => parseBRL(input)).toThrow();
  });

  it('formata valores grandes e negativos sem converter para number', () => {
    expect(formatBRL(9_007_199_254_740_993n)).toBe('R$ 90.071.992.547.409,93');
    expect(formatBRL(-1n)).toBe('-R$ 0,01');
    expect(formatBRL(0n)).toBe('R$ 0,00');
  });

  it('reproduz os quatro casos financeiros de referência isolados', () => {
    expect(parseBRL('50,00') - parseBRL('18,00')).toBe(3_200n);
    expect(sumCents(['13,00', '6,82', '29,99'].map(parseBRL))).toBe(4_981n);
    expect(sumCents(['186,62', '36,30'].map(parseBRL))).toBe(22_292n);
    expect(sumCents(['775,08', '428,63'].map(parseBRL))).toBe(120_371n);
  });

  it('aceita os extremos por lançamento e rejeita valores fora deles', () => {
    expect(() => assertEntryAmount(1n)).not.toThrow();
    expect(() => assertEntryAmount(MAX_ENTRY_CENTS)).not.toThrow();
    for (const invalid of [0n, -1n, MAX_ENTRY_CENTS + 1n, 100, '100']) {
      expect(() => assertEntryAmount(invalid)).toThrow();
    }
  });

  it('soma lançamentos válidos além do limite seguro de number e preserva um centavo', () => {
    const values = Array.from({ length: 100_000 }, () => MAX_ENTRY_CENTS);
    const total = sumCents(values);
    expect(total).toBe(9_999_999_999_900_000n);
    expect(total > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(sumCents([total, -9_999_999_999_899_999n])).toBe(1n);
    expect(sumCents([])).toBe(0n);
  });
});

describe('representação JSON de centavos', () => {
  it('preserva ida e volta de grandes somas e sinais', () => {
    for (const value of [0n, 1n, -1n, 9_007_199_254_740_993n, -9_007_199_254_740_993n]) {
      const json = JSON.stringify({ cents: encodeCents(value) });
      const parsed = JSON.parse(json) as { cents: unknown };
      expect(decodeCents(parsed.cents)).toBe(value);
    }
  });

  it.each([0, 100, null, undefined, '', '-0', '+1', '01', '-01', '1.0', '1e3', ' 1', '1 ', '1\n'])('rejeita representação não canônica: %s', (value) => {
    expect(() => decodeCents(value)).toThrow();
  });
});

describe('rateios determinísticos', () => {
  it('distribui o resto nas primeiras parcelas e preserva o total', () => {
    const parts = splitInstallments(100n, 3);
    expect(parts).toEqual([34n, 33n, 33n]);
    expect(sumCents(parts)).toBe(100n);
    expect(splitInstallments(1n, 1)).toEqual([1n]);
    expect(splitInstallments(10n, 10)).toEqual(Array.from({ length: 10 }, () => 1n));
  });

  it.each([0, -1, 1.5, 101, 1_201, NaN])('rejeita quantidade inválida de parcelas: %s', (count) => {
    expect(() => splitInstallments(100n, count)).toThrow();
  });

  it('calcula percentuais em pontos-base e arredonda empate para longe de zero', () => {
    expect(percentageCents(199n, 1_000n)).toBe(20n);
    expect(percentageCents(5n, 1_000n)).toBe(1n);
    expect(percentageCents(-5n, 1_000n)).toBe(-1n);
    expect(percentageCents(123n, 0n)).toBe(0n);
    expect(percentageCents(9_007_199_254_740_993n, 10_000n)).toBe(9_007_199_254_740_993n);
    expect(() => percentageCents(100n, 10_001n)).toThrow();
  });
});
