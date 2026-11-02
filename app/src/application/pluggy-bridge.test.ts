import { describe, expect, it } from 'vitest';
import { prepareBankImportCommand } from './pluggy-bridge';
import type { FinancialDataset } from '../domain';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const accountId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const dataset: FinancialDataset = {
  accounts: [{ id: accountId, userId, name: 'Conta teste', kind: 'checking', availability: 'free' }],
  categories: [], events: [], settlements: [], postings: [],
};
const candidate = {
  externalKey: 'pluggy:item-1:external-1:tx-1',
  accountId: 'external-1', date: '2026-11-02', description: 'Compra sintética',
  amountCents: 1500n, kind: 'expense' as const,
};
const context = { userId, nextId: () => crypto.randomUUID(), today: () => '2026-11-02', now: () => '2026-11-02T15:00:00.000Z' };
describe('Pluggy to Atlas command bridge', () => {
  it('generates a confirmed expense in the chosen Atlas account', () => {
    const command = prepareBankImportCommand(candidate, { pluggyAccountId: 'external-1', atlasAccountId: accountId }, dataset, context);
    expect(command.aggregate.events?.[0]).toMatchObject({ kind: 'expense', accountId, amountCents: 1500n, status: 'confirmed' });
    expect(command.aggregate.postings).toHaveLength(1);
  });
  it('rejects mismatched external or unknown Atlas accounts', () => {
    expect(() => prepareBankImportCommand(candidate, { pluggyAccountId: 'other', atlasAccountId: accountId }, dataset, context)).toThrow();
    expect(() => prepareBankImportCommand(candidate, { pluggyAccountId: 'external-1', atlasAccountId: crypto.randomUUID() }, dataset, context)).toThrow();
  });
});
