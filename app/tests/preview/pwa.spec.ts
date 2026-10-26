import { expect, test } from '@playwright/test';

test('shell de produção reabre offline sem apagar o IndexedDB', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar minha primeira conta' }).click();
  await page.getByLabel('Nome da conta').fill('Conta offline de teste');
  await page.getByPlaceholder('R$ 0,00').fill('50,00');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('R$ 50,00').first()).toBeVisible();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await expect(page.getByText('R$ 50,00').first()).toBeVisible();
  await context.setOffline(false);
});
