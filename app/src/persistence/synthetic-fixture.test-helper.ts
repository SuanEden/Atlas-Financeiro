import type { FinancialDataset } from '../domain';

/** Synthetic test data; never imports the user's historical requirements. */
export function syntheticDataset(userId: string): FinancialDataset {
  const ids = {
    cash: '00000000-0000-4000-8000-000000000010',
    reserve: '00000000-0000-4000-8000-000000000011',
    category: '00000000-0000-4000-8000-000000000020',
    event: '00000000-0000-4000-8000-000000000030',
    settlement: '00000000-0000-4000-8000-000000000040',
    debit: '00000000-0000-4000-8000-000000000050',
    credit: '00000000-0000-4000-8000-000000000051',
  };
  return {
    accounts: [
      { id: ids.cash, userId, name: 'Carteira de teste', kind: 'cash', availability: 'free' },
      { id: ids.reserve, userId, name: 'Reserva de teste', kind: 'savings', availability: 'reserved' },
    ],
    categories: [{ id: ids.category, userId, name: 'Categoria de teste', kind: 'both' }],
    events: [{
      id: ids.event, userId, kind: 'transfer', status: 'confirmed', source: 'manual', amountCents: 1_207n,
      accountId: ids.cash, transferAccountId: ids.reserve, description: 'Transferência sintética',
      competenceDate: '2026-10-24', certainty: 'confirmed',
    }],
    settlements: [{
      id: ids.settlement, userId, eventId: ids.event, amountCents: 1_207n,
      paymentDate: '2026-10-24', settlementDate: '2026-10-24',
    }],
    postings: [
      { id: ids.debit, userId, settlementId: ids.settlement, accountId: ids.cash, amountCents: -1_207n },
      { id: ids.credit, userId, settlementId: ids.settlement, accountId: ids.reserve, amountCents: 1_207n },
    ],
  };
}
