import type { FinancialDataset } from '../domain';
import { createTransactionCommand, type CommandContext, type LocalCommand } from './financial-commands';
import type { BankImportCandidate } from './pluggy-import';
import { serializeOperationPayload } from '../serialization';

/** Explicit mapping reviewed by owner; never assume Pluggy account identifiers are Atlas UUIDs. */
export interface BankImportMapping {
  pluggyAccountId: string;
  atlasAccountId: string;
}

/** Produces an ordinary Atlas financial command without persisting or transmitting it. */
export function prepareBankImportCommand(
  candidate: BankImportCandidate,
  mapping: BankImportMapping,
  dataset: FinancialDataset,
  context: CommandContext,
): LocalCommand {
  if (candidate.accountId !== mapping.pluggyAccountId) throw new TypeError('Conta externa não corresponde ao vínculo selecionado.');
  if (!dataset.accounts.some(account => account.id === mapping.atlasAccountId && account.userId === context.userId)) {
    throw new TypeError('Conta financeira do Atlas não encontrada para esta importação.');
  }
  if (candidate.amountCents <= 0n) throw new TypeError('Valor importado inválido.');
  const result = createTransactionCommand({
    kind: candidate.kind,
    accountId: mapping.atlasAccountId,
    amountCents: candidate.amountCents,
    description: candidate.description,
    date: candidate.date,
    realized: true,
  }, context);
  // A bank-imported event must remain attributable as imported in both the
  // local aggregate and its serialized operation, not be mislabeled 'manual'.
  if (result.aggregate.events?.[0]) result.aggregate.events[0].source = 'import';
  result.operation.payloadJson = serializeOperationPayload(result.aggregate, context.userId);
  return result;
}

/**
 * Stable event identity makes a repeated bank import fail closed even after
 * a lost ACK or a browser restart. The bank key is never copied into the
 * transaction description; its hash is scoped to the Atlas owner.
 */
export async function bankImportEventId(ownerId: string, externalKey: string): Promise<string> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(ownerId)) throw new TypeError('Usuário inválido.');
  if (!/^pluggy:[A-Za-z0-9_-]{1,150}:[A-Za-z0-9_-]{1,150}:[A-Za-z0-9_-]{1,150}$/.test(externalKey)) throw new TypeError('Chave bancária inválida.');
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ownerId + ':' + externalKey)));
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes.slice(0, 16)].map(value => value.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

/** Null means already present; no second financial event or outbox operation. */
export async function prepareUniqueBankImportCommand(
  candidate: BankImportCandidate,
  mapping: BankImportMapping,
  dataset: FinancialDataset,
  context: CommandContext,
): Promise<LocalCommand | null> {
  const eventId = await bankImportEventId(context.userId, candidate.externalKey);
  if (dataset.events.some(event => event.id === eventId)) return null;
  let calls = 0;
  return prepareBankImportCommand(candidate, mapping, dataset, {
    ...context,
    nextId: () => calls++ === 0 ? eventId : context.nextId(),
  });
}
