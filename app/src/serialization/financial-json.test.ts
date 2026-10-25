import { describe, expect, it } from 'vitest';
import { MAX_ENTRY_CENTS } from '../domain';
import { syntheticDataset } from '../persistence/synthetic-fixture.test-helper';
import { deserializeFinancialDataset, serializeFinancialDataset } from './financial-json';

const USER_ID = '20000000-0000-4000-8000-000000000001';

function representation(): Record<string, unknown> {
  return JSON.parse(serializeFinancialDataset(syntheticDataset(USER_ID), USER_ID)) as Record<string, unknown>;
}

function firstEvent(root: Record<string, unknown>): Record<string, unknown> {
  return (root.events as Record<string, unknown>[])[0]!;
}

describe('versioned explicit financial JSON', () => {
  it('round-trips positive and negative bigint using decimal strings in schema version 1', () => {
    const dataset = syntheticDataset(USER_ID);
    const json = serializeFinancialDataset(dataset, USER_ID);
    const root = JSON.parse(json) as Record<string, unknown>;
    expect(root.schemaVersion).toBe(1);
    expect(firstEvent(root).source).toBe('manual');
    expect(firstEvent(root).amountCents).toBe('1207');
    expect((root.postings as Record<string, unknown>[])[0]!.amountCents).toBe('-1207');
    expect(deserializeFinancialDataset(json, USER_ID)).toEqual(dataset);
  });

  it.each([1207, 1.5, '01', '-0', '+1207', '1e3', '1E3', '1.00', ' 1207', '1207 ', '', '0x10', null])(
    'rejects noncanonical monetary value %j before it can become a financial value', (value) => {
      const root = representation();
      firstEvent(root).amountCents = value;
      expect(() => deserializeFinancialDataset(JSON.stringify(root), USER_ID)).toThrow();
    },
  );

  it('rejects a monetary value outside the domain limit', () => {
    const root = representation();
    firstEvent(root).amountCents = (MAX_ENTRY_CENTS + 1n).toString();
    expect(() => deserializeFinancialDataset(JSON.stringify(root), USER_ID)).toThrow();
  });

  it('requires a supported source and rejects opening balance on a transfer', () => {
    const missingSource = representation();
    delete firstEvent(missingSource).source;
    expect(() => deserializeFinancialDataset(JSON.stringify(missingSource), USER_ID)).toThrow();
    const unknownSource = representation();
    firstEvent(unknownSource).source = 'unknown';
    expect(() => deserializeFinancialDataset(JSON.stringify(unknownSource), USER_ID)).toThrow();
    const openingTransfer = representation();
    firstEvent(openingTransfer).source = 'opening_balance';
    expect(() => deserializeFinancialDataset(JSON.stringify(openingTransfer), USER_ID)).toThrow();
  });

  it('rejects unsupported versions, missing collections, unknown fields and another user', () => {
    const unsupported = representation();
    unsupported.schemaVersion = 2;
    expect(() => deserializeFinancialDataset(JSON.stringify(unsupported), USER_ID)).toThrow();
    const missing = representation();
    delete missing.settlements;
    expect(() => deserializeFinancialDataset(JSON.stringify(missing), USER_ID)).toThrow();
    const unknown = representation();
    firstEvent(unknown).accessToken = 'synthetic-do-not-accept';
    expect(() => deserializeFinancialDataset(JSON.stringify(unknown), USER_ID)).toThrow();
    expect(() => deserializeFinancialDataset(JSON.stringify(representation()), 'other-user')).toThrow();
  });

  it('does not interpret descriptions as money or include undeclared properties in output', () => {
    const dataset = syntheticDataset(USER_ID);
    dataset.events[0]!.description = '001 não é um campo monetário';
    const accountWithExtra = Object.assign(dataset.accounts[0]!, { secret: 'synthetic-secret' });
    dataset.accounts[0] = accountWithExtra;
    const json = serializeFinancialDataset(dataset, USER_ID);
    expect(json).not.toContain('synthetic-secret');
    expect(deserializeFinancialDataset(json, USER_ID).events[0]!.description).toBe('001 não é um campo monetário');
  });

  it('validates referential and transfer invariants after decoding', () => {
    const root = representation();
    (root.postings as Record<string, unknown>[])[1]!.amountCents = '1206';
    expect(() => deserializeFinancialDataset(JSON.stringify(root), USER_ID)).toThrow();
  });
});
