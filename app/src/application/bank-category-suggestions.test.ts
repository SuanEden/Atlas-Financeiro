import { expect, it } from 'vitest';
import { suggestBankCategory } from './bank-category-suggestions';
import type { FinancialDataset } from '../domain';
import type { BankImportCandidate } from './pluggy-import';

it('suggests a compatible existing child and leaves uncertain operations unclassified', () => {
  const userId = 'owner';
  const dataset: FinancialDataset = {
    accounts: [], events: [], settlements: [], postings: [],
    categories: [
      { id: 'subscriptions', userId, kind: 'expense', name: 'Serviços e assinaturas' },
      { id: 'spotify', userId, kind: 'expense', parentId: 'subscriptions', name: 'Spotify' },
    ],
  };
  const candidate: BankImportCandidate = {
    externalKey: 'test', accountId: 'bank', kind: 'expense', amountCents: 100n,
    date: '2026-11-21', description: 'SPOTIFY PREMIUM',
  };
  expect(suggestBankCategory(dataset, candidate, userId)?.id).toBe('spotify');
  expect(suggestBankCategory(dataset, { ...candidate, description: 'PIX Spotify' }, userId)).toBeUndefined();
  expect(suggestBankCategory(dataset, { ...candidate, description: 'Estorno Spotify' }, userId)).toBeUndefined();
  expect(suggestBankCategory(dataset, { ...candidate, kind: 'income' }, userId)).toBeUndefined();
  expect(suggestBankCategory(dataset, candidate, 'other')).toBeUndefined();
  dataset.categories.push({ ...dataset.categories[1]!, id: 'duplicate' });
  expect(suggestBankCategory(dataset, candidate, userId)).toBeUndefined();
});
