import { describe, expect, it } from 'vitest';
import { pluggyCandidate, previewPluggyImport, type PluggyTransaction } from './pluggy-import';

const row: PluggyTransaction = {
  id: 'transaction-1', accountId: 'account-1', date: '2026-11-02',
  description: ' PIX recebido ', amount: 160.74, currencyCode: 'BRL', status: 'POSTED',
};
describe('Pluggy import safety boundary', () => {
  it('converts incoming BRL into exact positive cents', () => {
    expect(pluggyCandidate('item-1', row)).toEqual({
      externalKey: 'pluggy:item-1:account-1:transaction-1', accountId: 'account-1',
      date: '2026-11-02', description: 'PIX recebido', amountCents: 16074n, kind: 'income',
    });
  });
  it('handles outgoing operations and skips pending and zero transactions', () => {
    expect(pluggyCandidate('item-1', { ...row, amount: -36.30 })?.kind).toBe('expense');
    expect(pluggyCandidate('item-1', { ...row, amount: -36.30 })?.amountCents).toBe(3630n);
    expect(pluggyCandidate('item-1', { ...row, amount: 0 })).toBeNull();
    expect(pluggyCandidate('item-1', { ...row, status: 'PENDING' })).toBeNull();
  });
  it('uses the provider CREDIT/DEBIT direction, never assumes the amount sign is authoritative', () => {
    expect(pluggyCandidate('item-1', { ...row, amount: 25, type:'DEBIT' })?.kind).toBe('expense');
    expect(pluggyCandidate('item-1', { ...row, amount: -25, type:'CREDIT' })?.kind).toBe('income');
    expect(pluggyCandidate('item-1', { ...row, status:undefined })).toBeNull();
    expect(() => pluggyCandidate('item-1', { ...row, type:'UNEXPECTED' as 'CREDIT' })).toThrow();
  });
  it('deduplicates within a batch and against persisted external IDs', () => {
    expect(previewPluggyImport('item-1', [row, row])).toHaveLength(1);
    expect(previewPluggyImport('item-1', [row], new Set(['pluggy:item-1:account-1:transaction-1']))).toEqual([]);
    expect(previewPluggyImport('item-2', [row])).toHaveLength(1);
  });
  it('rejects currencies and imprecise values rather than posting wrong money', () => {
    expect(() => pluggyCandidate('item-1', { ...row, currencyCode: 'USD' })).toThrow();
    expect(() => pluggyCandidate('item-1', { ...row, amount: 1.001 })).toThrow();
    expect(() => pluggyCandidate('item-1', { ...row, amount: Number.NaN })).toThrow();
    expect(() => pluggyCandidate('item-1', { ...row, date: '2026-02-30' })).toThrow();
  });
});
