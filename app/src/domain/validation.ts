import { assertEntryAmount, assertPostingAmount, sumCents } from './money';
import type { FinancialDataset, OwnedEntity } from './models';
import { parseMonthlyRecurrenceRule } from './recurrence';

function fail(message: string): never {
  throw new TypeError(message);
}

function assertText(value: unknown, label: string, maxLength = 128): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maxLength) {
    fail(`${label} deve conter texto não vazio de até ${maxLength} caracteres.`);
  }
}

function assertEnum(value: unknown, allowed: readonly string[], label: string): void {
  if (typeof value !== 'string' || !allowed.includes(value)) fail(`${label} inválido.`);
}

export function assertEntityId(value: unknown, label = 'Identificador'): asserts value is string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) {
    fail(`${label} deve usar um UUID canônico em letras minúsculas.`);
  }
}

export function assertIsoDate(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Data deve usar AAAA-MM-DD.');
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maximum = monthDays[month - 1];
  if (year < 1 || maximum === undefined || day < 1 || day > maximum) fail('Data de calendário inválida.');
}

function assertOwnedRows<T extends OwnedEntity>(rows: T[], userId: string, label: string): Map<string, T> {
  if (!Array.isArray(rows)) fail(`${label} deve ser uma lista.`);
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!row || typeof row !== 'object') fail(`${label} contém registro inválido.`);
    assertEntityId(row.id, 'Identificador');
    assertEntityId(row.userId, 'Proprietário');
    if (row.userId !== userId) fail('O conjunto contém registros de outro proprietário.');
    if (map.has(row.id)) fail(`${label} contém identificadores repetidos.`);
    map.set(row.id, row);
  }
  return map;
}

/** Validates a complete owner's dataset, including all aggregate references. */
export function assertFinancialDataset(dataset: FinancialDataset, expectedUserId: string): void {
  assertEntityId(expectedUserId, 'Proprietário');
  if (!dataset || typeof dataset !== 'object') fail('Conjunto financeiro inválido.');
  const accounts = assertOwnedRows(dataset.accounts, expectedUserId, 'Contas');
  const categories = assertOwnedRows(dataset.categories, expectedUserId, 'Categorias');
  const events = assertOwnedRows(dataset.events, expectedUserId, 'Eventos');
  const settlements = assertOwnedRows(dataset.settlements, expectedUserId, 'Liquidações');
  assertOwnedRows(dataset.postings, expectedUserId, 'Contrapartidas');

  for (const account of accounts.values()) {
    assertText(account.name, 'Nome da conta', 120);
    assertEnum(account.kind, ['checking', 'savings', 'cash', 'digital', 'transport', 'investment', 'other'], 'Tipo de conta');
    assertEnum(account.availability, ['free', 'reserved', 'restricted'], 'Disponibilidade');
    if (account.kind === 'transport' && account.availability !== 'restricted') fail('Conta de transporte deve ter uso restrito.');
  }
  for (const category of categories.values()) {
    assertText(category.name, 'Nome da categoria', 120);
    assertEnum(category.kind, ['income', 'expense', 'both'], 'Tipo de categoria');
    const visited = new Set([category.id]);
    let parentId = category.parentId;
    while (parentId !== undefined) {
      assertEntityId(parentId, 'Categoria superior');
      if (visited.has(parentId)) fail('Categorias não podem formar ciclos.');
      visited.add(parentId);
      const parent = categories.get(parentId);
      if (!parent) fail('Categoria superior inexistente.');
      parentId = parent.parentId;
    }
  }
  for (const event of events.values()) {
    assertEnum(event.kind, ['income', 'expense', 'transfer', 'adjustment'], 'Tipo de evento');
    assertEnum(event.source, ['manual', 'import', 'opening_balance'], 'Origem do evento');
    if (event.source === 'opening_balance' && event.kind !== 'adjustment') fail('Saldo inicial deve ser registrado como ajuste.');
    assertEnum(event.status, ['planned', 'confirmed', 'cancelled'], 'Status financeiro');
    assertEnum(event.certainty, ['confirmed', 'estimated'], 'Certeza da informação');
    if (!(event.amountCents === 0n && event.kind === 'adjustment' && event.source === 'opening_balance')) assertEntryAmount(event.amountCents);
    assertText(event.description, 'Descrição', 500);
    assertEntityId(event.accountId, 'Conta do evento');
    assertIsoDate(event.competenceDate);
    if (event.dueDate !== undefined) assertIsoDate(event.dueDate);
    if (!accounts.has(event.accountId)) fail('Conta do evento inexistente.');
    if (event.status === 'confirmed' && event.certainty !== 'confirmed') fail('Um evento confirmado não pode conter valor estimado.');
    if (event.kind === 'transfer') {
      assertEntityId(event.transferAccountId, 'Conta de destino');
      if (!accounts.has(event.transferAccountId) || event.accountId === event.transferAccountId) fail('Transferência exige duas contas existentes e distintas.');
    } else if (event.transferAccountId !== undefined) fail('Somente transferência pode ter conta de destino.');
    if (event.kind === 'adjustment') {
      assertEnum(event.adjustmentDirection, ['increase', 'decrease'], 'Direção do ajuste');
    } else if (event.adjustmentDirection !== undefined) fail('Somente ajuste pode ter direção de ajuste.');
    if (event.categoryId !== undefined) {
      assertEntityId(event.categoryId, 'Categoria');
      const category = categories.get(event.categoryId);
      if (!category) fail('Categoria do evento inexistente.');
      if (event.kind !== 'income' && event.kind !== 'expense') fail('Transferências e ajustes não recebem categoria de renda ou despesa.');
      if (category.kind !== 'both' && category.kind !== event.kind) fail('Categoria incompatível com a natureza do evento.');
    }
    if (event.reversesEventId !== undefined) assertEntityId(event.reversesEventId, 'Evento estornado');
    if (event.replacesEventId !== undefined) assertEntityId(event.replacesEventId, 'Evento substituído');
    if (event.recurrenceJson !== undefined) {
      parseMonthlyRecurrenceRule(event.recurrenceJson);
      if (event.status !== 'planned' || (event.kind !== 'income' && event.kind !== 'expense') || event.recurrenceRuleId !== undefined || event.recurrenceMonth !== undefined) {
        fail('Uma regra recorrente deve ser um modelo previsto de receita ou despesa.');
      }
    }
    if (event.recurrenceRuleId !== undefined) {
      assertEntityId(event.recurrenceRuleId, 'Regra recorrente');
      if (event.recurrenceMonth === undefined || !/^\d{4}-(0[1-9]|1[0-2])$/.test(event.recurrenceMonth)) fail('Ocorrência recorrente exige competência AAAA-MM.');
    } else if (event.recurrenceMonth !== undefined) fail('Competência recorrente exige uma regra vinculada.');
    if (event.reversesEventId !== undefined && event.replacesEventId !== undefined) {
      fail('Um evento não pode ser estorno e substituição ao mesmo tempo.');
    }
  }

  for (const event of events.values()) {
    if (event.recurrenceRuleId !== undefined) {
      const rule = events.get(event.recurrenceRuleId);
      if (!rule || rule.recurrenceJson === undefined || rule.kind !== event.kind || rule.id === event.id) fail('A ocorrência deve apontar para uma regra recorrente compatível.');
    }
  }

  const reversed = new Set<string>();
  const replaced = new Set<string>();
  for (const event of events.values()) {
    if (event.reversesEventId !== undefined) {
      const original = events.get(event.reversesEventId);
      if (!original || original.id === event.id) fail('Estorno exige evento original existente e distinto.');
      if (original.reversesEventId !== undefined) fail('Não é permitido estornar um estorno.');
      if (reversed.has(original.id)) fail('Um evento não pode receber dois estornos.');
      if (event.status !== 'confirmed' || event.certainty !== 'confirmed' || original.status !== 'confirmed') {
        fail('Estorno exige eventos confirmados.');
      }
      if (event.kind !== original.kind || event.amountCents !== original.amountCents || event.accountId !== original.accountId
        || event.transferAccountId !== original.transferAccountId || event.categoryId !== original.categoryId
        || event.adjustmentDirection !== original.adjustmentDirection) {
        fail('Estorno deve preservar natureza, valor, contas e categoria do evento original.');
      }
      reversed.add(original.id);
    }
    if (event.replacesEventId !== undefined) {
      const original = events.get(event.replacesEventId);
      if (!original || original.id === event.id) fail('Substituição exige evento original existente e distinto.');
      if (replaced.has(original.id)) fail('Um evento não pode receber duas substituições.');
      if (event.reversesEventId !== undefined) fail('Um estorno não pode substituir outro evento.');
      replaced.add(original.id);
    }
  }

  const settledByEvent = new Map<string, bigint>();
  for (const settlement of settlements.values()) {
    assertEntryAmount(settlement.amountCents);
    assertEntityId(settlement.eventId, 'Evento da liquidação');
    assertIsoDate(settlement.paymentDate);
    assertIsoDate(settlement.settlementDate);
    if (settlement.paymentDate > settlement.settlementDate) fail('Liquidação não pode anteceder o pagamento.');
    const event = events.get(settlement.eventId);
    if (!event || event.status !== 'confirmed') fail('Liquidação exige um evento confirmado existente.');
    const settled = (settledByEvent.get(event.id) ?? 0n) + settlement.amountCents;
    if (settled > event.amountCents) fail('Liquidações não podem ultrapassar o valor do evento.');
    settledByEvent.set(event.id, settled);
  }
  for (const originalId of reversed) {
    const original = events.get(originalId);
    const reversal = [...events.values()].find((event) => event.reversesEventId === originalId);
    if (!original || !reversal || settledByEvent.get(originalId) !== original.amountCents || settledByEvent.get(reversal.id) !== reversal.amountCents) {
      fail('Estorno exige liquidação integral do evento original e da contrapartida inversa.');
    }
  }
  for (const event of events.values()) {
    if (event.replacesEventId !== undefined && settledByEvent.has(event.replacesEventId) && !reversed.has(event.replacesEventId)) {
      fail('Substituir evento liquidado exige estorno atômico do original.');
    }
    const chain = new Set([event.id]);
    let previousId = event.replacesEventId;
    while (previousId !== undefined) {
      if (chain.has(previousId)) fail('Substituições de eventos não podem formar ciclos.');
      chain.add(previousId);
      previousId = events.get(previousId)?.replacesEventId;
    }
  }

  const postingsBySettlement = new Map<string, typeof dataset.postings>();
  for (const posting of dataset.postings) {
    assertPostingAmount(posting.amountCents);
    assertEntityId(posting.settlementId, 'Liquidação da contrapartida');
    assertEntityId(posting.accountId, 'Conta da contrapartida');
    if (!settlements.has(posting.settlementId)) fail('Liquidação da contrapartida inexistente.');
    if (!accounts.has(posting.accountId)) fail('Conta da contrapartida inexistente.');
    const rows = postingsBySettlement.get(posting.settlementId) ?? [];
    rows.push(posting);
    postingsBySettlement.set(posting.settlementId, rows);
  }
  for (const settlement of settlements.values()) {
    const event = events.get(settlement.eventId);
    if (!event) fail('Evento da liquidação inexistente.');
    const postings = postingsBySettlement.get(settlement.id) ?? [];
    if (event.kind === 'transfer') {
      const outgoing = postings.find((posting) => posting.accountId === event.accountId);
      const incoming = postings.find((posting) => posting.accountId === event.transferAccountId);
      const direction = event.reversesEventId === undefined ? 1n : -1n;
      if (postings.length !== 2 || !outgoing || !incoming || outgoing.amountCents !== -settlement.amountCents * direction || incoming.amountCents !== settlement.amountCents * direction || sumCents(postings.map((posting) => posting.amountCents)) !== 0n) {
        fail('Transferência exige exatamente duas contrapartidas opostas pelo valor liquidado.');
      }
    } else {
      const posting = postings[0];
      const positive = event.kind === 'income' || (event.kind === 'adjustment' && event.adjustmentDirection === 'increase');
      const natural = positive ? settlement.amountCents : -settlement.amountCents;
      const expected = event.reversesEventId === undefined ? natural : -natural;
      if (postings.length !== 1 || !posting || posting.accountId !== event.accountId || posting.amountCents !== expected) {
        fail('Contrapartida incompatível com a natureza e o valor da liquidação.');
      }
    }
  }
}
