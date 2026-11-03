import type { BankLink } from '../remote/bank-auto-import';

const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const VALID_ITEM_IDS = new Set([
  '71c06153-0d24-45ac-81f6-9de6f0d04282',
  '1c91ee97-e614-494f-b41a-5e203d5fa7ee',
]);
const FIELDS = new Set(['itemId', 'pluggyAccountId', 'atlasAccountId', 'activatedOn', 'activatedAt']);
function validDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

/** Export-only metadata: no secrets, Google sessions, tokens, or credentials. */
export function validateBankLinks(raw: unknown, accountIds: ReadonlySet<string>): Record<string, BankLink> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError('Vínculos bancários inválidos.');
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > 20) throw new RangeError('Quantidade excessiva de vínculos bancários.');
  const result: Record<string, BankLink> = Object.create(null) as Record<string, BankLink>;
  const mappedAccounts = new Set<string>();
  for (const [key, value] of entries) {
    if (!uuid.test(key) || !value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Identificador de vínculo bancário inválido.');
    const link = value as Record<string, unknown>;
    if (Object.keys(link).some(field => !FIELDS.has(field))) throw new TypeError('Vínculo contém campos não autorizados.');
    if (link.pluggyAccountId !== key || typeof link.itemId !== 'string' || !VALID_ITEM_IDS.has(link.itemId)
      || typeof link.atlasAccountId !== 'string' || !accountIds.has(link.atlasAccountId)
      || typeof link.activatedOn !== 'string' || !validDay(link.activatedOn))
      throw new TypeError('Vínculo bancário não corresponde a uma conta deste backup.');
    if (mappedAccounts.has(link.atlasAccountId)) throw new TypeError('Duas conexões bancárias apontam para a mesma conta financeira.');
    mappedAccounts.add(link.atlasAccountId);
    if (link.activatedAt !== undefined && (typeof link.activatedAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T/.test(link.activatedAt) || !Number.isFinite(Date.parse(link.activatedAt))))
      throw new TypeError('Data de ativação bancária inválida.');
    result[key] = {
      itemId: link.itemId,
      pluggyAccountId: key,
      atlasAccountId: link.atlasAccountId,
      activatedOn: link.activatedOn,
      ...(link.activatedAt === undefined ? {} : { activatedAt: link.activatedAt as string }),
    };
  }
  return result;
}
