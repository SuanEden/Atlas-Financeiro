import { describe, expect, it } from 'vitest';
import { bankImportEventId, prepareUniqueBankImportCommand, prepareBankImportCommand } from './pluggy-bridge';
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
  it('refuses a reused imported event ID whose amount, date or target account differs',async()=>{
    const first=await prepareUniqueBankImportCommand(candidate,{pluggyAccountId:'external-1',atlasAccountId:accountId},dataset,context);
    const stored={...dataset,events:[first!.aggregate.events![0]!]};
    await expect(prepareUniqueBankImportCommand({...candidate,amountCents:1600n},{pluggyAccountId:'external-1',atlasAccountId:accountId},stored,context)).rejects.toThrow(/Identificador bancário/);
    await expect(prepareUniqueBankImportCommand({...candidate,date:'2026-11-03'},{pluggyAccountId:'external-1',atlasAccountId:accountId},stored,context)).rejects.toThrow(/Identificador bancário/);
    await expect(prepareUniqueBankImportCommand(candidate,{pluggyAccountId:'external-1',atlasAccountId:crypto.randomUUID()},stored,context)).rejects.toThrow(/Identificador bancário/);
    expect(stored.events).toHaveLength(1);
  });
  it('assigns stable owner-scoped IDs across sessions and ignores a previously imported event', async () => {
    const first = await prepareUniqueBankImportCommand(candidate, { pluggyAccountId: 'external-1', atlasAccountId: accountId }, dataset, context);
    const second = await prepareUniqueBankImportCommand(candidate, { pluggyAccountId: 'external-1', atlasAccountId: accountId }, dataset, context);
    expect(first?.aggregate.events?.[0]?.id).toBe(second?.aggregate.events?.[0]?.id);
    const stored = { ...dataset, events: [first!.aggregate.events![0]!] };
    expect(await prepareUniqueBankImportCommand(candidate, { pluggyAccountId: 'external-1', atlasAccountId: accountId }, stored, context)).toBeNull();
    expect(await bankImportEventId(userId, candidate.externalKey)).not.toBe(await bankImportEventId(crypto.randomUUID(), candidate.externalKey));
  });

});
