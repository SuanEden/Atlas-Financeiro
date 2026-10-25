/** Monetary arithmetic is always expressed in integer centavos. */
export type MoneyCents = bigint;

export const MAX_ENTRY_CENTS = 99_999_999_999n;

export function assertEntryAmount(value: unknown): asserts value is MoneyCents {
  if (typeof value !== 'bigint' || value < 1n || value > MAX_ENTRY_CENTS) {
    throw new RangeError('O valor deve estar entre 1 e 99.999.999.999 centavos inteiros.');
  }
}

export function assertPostingAmount(value: unknown): asserts value is MoneyCents {
  if (typeof value !== 'bigint' || value === 0n || value < -MAX_ENTRY_CENTS || value > MAX_ENTRY_CENTS) {
    throw new RangeError('A contrapartida deve conter centavos não nulos dentro do limite por lançamento.');
  }
}

/** JSON cannot encode bigint. Wire values use canonical decimal strings. */
export function encodeCents(value: MoneyCents): string {
  if (typeof value !== 'bigint') throw new TypeError('Centavos devem usar bigint.');
  return value.toString(10);
}

export function decodeCents(value: unknown): MoneyCents {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*|-[1-9]\d*)$/.test(value)) {
    throw new TypeError('Centavos serializados devem ser uma string decimal canônica.');
  }
  return BigInt(value);
}

/** Accepts pt-BR input, including an optional R$ prefix; never parses via Number. */
export function parseBRL(input: string): MoneyCents {
  if (typeof input !== 'string') throw new TypeError('Informe o valor como texto.');
  const normalized = input.replace(/\u00a0/g, ' ').trim();
  const match = /^(-)?(?:R\$\s*)?((?:0|[1-9]\d*|[1-9]\d{0,2}(?:\.\d{3})+))(?:,(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new TypeError('Use um valor no formato brasileiro, como 1.234,56.');
  const integerPart = match[2];
  if (integerPart === undefined) throw new TypeError('Valor monetário inválido.');
  const cents = BigInt(integerPart.replace(/\./g, '')) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'));
  return match[1] ? -cents : cents;
}

export function formatBRL(value: MoneyCents): string {
  if (typeof value !== 'bigint') throw new TypeError('Centavos devem usar bigint.');
  const magnitude = value < 0n ? -value : value;
  const reais = (magnitude / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centavos = (magnitude % 100n).toString().padStart(2, '0');
  return `${value < 0n ? '-' : ''}R$ ${reais},${centavos}`;
}

export function sumCents(values: Iterable<MoneyCents>): MoneyCents {
  let total = 0n;
  for (const value of values) {
    if (typeof value !== 'bigint') throw new TypeError('Centavos devem usar bigint.');
    total += value;
  }
  return total;
}

/** Remainder centavos go to the earliest installments, preserving the total. */
export function splitInstallments(total: MoneyCents, count: number): MoneyCents[] {
  assertEntryAmount(total);
  if (!Number.isSafeInteger(count) || count < 1 || count > 1_200 || BigInt(count) > total) {
    throw new RangeError('Informe de 1 a 1.200 parcelas, cada uma com pelo menos um centavo.');
  }
  const divisor = BigInt(count);
  const quotient = total / divisor;
  const remainder = total % divisor;
  return Array.from({ length: count }, (_, index) => quotient + (BigInt(index) < remainder ? 1n : 0n));
}

/** 10_000 basis points = 100%; ties round away from zero to one centavo. */
export function percentageCents(amount: MoneyCents, basisPoints: bigint): MoneyCents {
  if (typeof amount !== 'bigint' || typeof basisPoints !== 'bigint' || basisPoints < 0n || basisPoints > 10_000n) {
    throw new RangeError('Informe centavos bigint e percentual entre 0 e 10.000 pontos-base.');
  }
  const product = amount * basisPoints;
  const magnitude = product < 0n ? -product : product;
  const rounded = (magnitude + 5_000n) / 10_000n;
  return product < 0n ? -rounded : rounded;
}
