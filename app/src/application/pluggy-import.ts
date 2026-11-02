/**
 * Pluggy read-only import boundary. Only feed this module with data fetched by
 * a trusted server; never expose a Pluggy API key or client secret in the PWA.
 * This is a preview/deduplication stage, not a financial posting operation.
 */
export interface PluggyTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currencyCode?: string;
  status?: string;
}
export interface BankImportCandidate {
  externalKey: string;
  accountId: string;
  date: string;
  description: string;
  amountCents: bigint;
  kind: 'income' | 'expense';
}
function safeId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(value)) throw new TypeError(label + ' inválido.');
  return value;
}
function calendarDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date)) throw new TypeError('Data bancária inválida.');
  const day = date.slice(0, 10);
  const parsed = new Date(day + 'T00:00:00.000Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) throw new TypeError('Data bancária inválida.');
  return day;
}
/** Exact integer-cent conversion; no silent floating-point rounding. */
function cents(amount: number): bigint {
  if (!Number.isFinite(amount) || Math.abs(amount) > 999_999_999.99) throw new RangeError('Valor bancário fora do limite.');
  const scaled = Math.round(amount * 100);
  if (Math.abs(amount * 100 - scaled) > 0.000001 || !Number.isSafeInteger(scaled)) throw new TypeError('Valor bancário não representa centavos exatos.');
  return BigInt(scaled);
}
export function pluggyCandidate(itemId: string, row: PluggyTransaction): BankImportCandidate | null {
  safeId(itemId, 'Conexão');
  safeId(row.id, 'Transação');
  safeId(row.accountId, 'Conta');
  if (row.currencyCode !== undefined && row.currencyCode !== 'BRL') throw new TypeError('Somente transações BRL são suportadas.');
  if (row.status !== undefined && row.status !== 'POSTED') return null; // pending/nonfinal is not money moved
  const amountCents = cents(row.amount);
  if (amountCents === 0n) return null;
  const description = row.description.trim();
  if (!description || description.length > 500) throw new TypeError('Descrição bancária inválida.');
  return {
    externalKey: 'pluggy:' + itemId + ':' + row.accountId + ':' + row.id,
    accountId: row.accountId,
    date: calendarDate(row.date),
    description,
    amountCents: amountCents < 0n ? -amountCents : amountCents,
    kind: amountCents < 0n ? 'expense' : 'income',
  };
}
/** Idempotent preview; on refresh use the same persisted external keys. */
export function previewPluggyImport(
  itemId: string, transactions: PluggyTransaction[], previouslyImported: ReadonlySet<string> = new Set(),
): BankImportCandidate[] {
  const seen = new Set(previouslyImported);
  const candidates: BankImportCandidate[] = [];
  for (const transaction of transactions) {
    const candidate = pluggyCandidate(itemId, transaction);
    if (!candidate || seen.has(candidate.externalKey)) continue;
    seen.add(candidate.externalKey);
    candidates.push(candidate);
  }
  return candidates;
}
