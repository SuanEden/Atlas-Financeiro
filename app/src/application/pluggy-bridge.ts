import type { FinancialDataset } from '../domain';
import { createTransactionCommand, type CommandContext, type LocalCommand } from './financial-commands';
import type { BankImportCandidate } from './pluggy-import';

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
  return createTransactionCommand({
    kind: candidate.kind,
    accountId: mapping.atlasAccountId,
    amountCents: candidate.amountCents,
    description: candidate.description,
    date: candidate.date,
    realized: true,
  }, context);
}
