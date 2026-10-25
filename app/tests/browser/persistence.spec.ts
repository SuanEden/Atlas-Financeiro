import { expect, test } from '@playwright/test';

test('bigint permanece exato no IndexedDB após recarregar a página e no JSON', async ({ page }) => {
  await page.goto('/');
  const databaseName = await page.evaluate(async () => {
    const modulePath = '/tests/browser-harness.ts';
    const harness = await import(/* @vite-ignore */ modulePath) as typeof import('../browser-harness');
    return harness.writeSyntheticTransfer();
  });
  expect(databaseName).toContain('10000000-0000-4000-8000-000000000001');
  await page.reload();
  const result = await page.evaluate(async () => {
    const modulePath = '/tests/browser-harness.ts';
    const harness = await import(/* @vite-ignore */ modulePath) as typeof import('../browser-harness');
    return harness.inspectReopenedTransfer();
  });
  expect(result).toEqual({
    eventType: 'bigint', amount: '99999999999', outgoing: '-99999999999', incoming: '99999999999',
    sum: '0', balance: '-99999999999', jsonUsesStrings: true, restoredType: 'bigint', restoredAmount: '99999999999', beforeLiquidation: '0',
  });
});

test('falha na última coleção reverte todas as gravações no IndexedDB nativo', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const modulePath = '/tests/browser-harness.ts';
    const harness = await import(/* @vite-ignore */ modulePath) as typeof import('../browser-harness');
    return harness.proveNativeRollback();
  });
  expect(result.rejected).toBe(true);
  expect(result.injectedFailure).toBe(true);
  expect(result.earlierWrites).toBeGreaterThan(0);
  expect(result.baselinePreserved).toBe(true);
  expect(result.counts).toEqual([1, 0, 0, 0]);
});
