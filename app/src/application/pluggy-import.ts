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
  type?: 'CREDIT' | 'DEBIT';
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
  if (typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(date)) throw new TypeError('Data bancária inválida.');
  const day=date.slice(0,10);
  const base=new Date(day+'T00:00:00.000Z');
  if (Number.isNaN(base.getTime())||base.toISOString().slice(0,10)!==day) throw new TypeError('Data bancária inválida.');
  if(date.length===10)return day;
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(date))throw new TypeError('Data bancária inválida.');
  const instant=new Date(date);
  if(Number.isNaN(instant.getTime()))throw new TypeError('Data bancária inválida.');
  // Pluggy timestamps are UTC. Atlas accounting dates follow Fortaleza.
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit',
  }).formatToParts(instant);
  const field=(kind:string)=>parts.find(part=>part.type===kind)?.value;
  return field('year')+'-'+field('month')+'-'+field('day');
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
  if (row.status !== 'POSTED') return null; // missing/pending status never becomes settled money
  const amountCents = cents(row.amount);
  if (amountCents === 0n) return null;
  if (row.type !== undefined && row.type !== 'CREDIT' && row.type !== 'DEBIT') throw new TypeError('Tipo de transação bancária inválido.');
  const description = row.description.trim();
  if (!description || description.length > 500) throw new TypeError('Descrição bancária inválida.');
  return {
    externalKey: 'pluggy:' + itemId + ':' + row.accountId + ':' + row.id,
    accountId: row.accountId,
    date: calendarDate(row.date),
    description,
    amountCents: amountCents < 0n ? -amountCents : amountCents,
    // Pluggy normalizes CREDIT/DEBIT; the type is authoritative when provided.
    kind: row.type ? (row.type === 'DEBIT' ? 'expense' : 'income') : (amountCents < 0n ? 'expense' : 'income'),
  };
}
/** Idempotent preview; on refresh use the same persisted external keys. */
export function previewPluggyImport(
  itemId: string, transactions: PluggyTransaction[], previouslyImported: ReadonlySet<string> = new Set(),
): BankImportCandidate[] {
  const seen = new Map<string, BankImportCandidate>();
  const candidates: BankImportCandidate[] = [];
  for (const transaction of transactions) {
    const candidate = pluggyCandidate(itemId, transaction);
    if (!candidate) continue;
    const prior = seen.get(candidate.externalKey);
    if (prior) {
      if (prior.date !== candidate.date || prior.kind !== candidate.kind ||
          prior.amountCents !== candidate.amountCents ||
          prior.description !== candidate.description ||
          prior.accountId !== candidate.accountId)
        throw new TypeError('O banco retornou o mesmo identificador com dados diferentes. Importe somente após conferir o extrato; nenhum lançamento foi gravado.');
      continue;
    }
    seen.set(candidate.externalKey,candidate);
    if (!previouslyImported.has(candidate.externalKey)) candidates.push(candidate);
  }
  return candidates;
}
