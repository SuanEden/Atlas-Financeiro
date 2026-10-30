import { expect, test } from '@playwright/test';

test('shell e outbox de produção reabrem offline e permitem novos lançamentos', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar minha primeira conta' }).click();
  await page.getByLabel('Nome da conta').fill('Conta offline de teste');
  await page.getByPlaceholder('R$ 0,00').fill('50,00');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('R$ 50,00').first()).toBeVisible();
  const pendingBefore = await page.locator('.sidebar-footer').textContent();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await expect(page.getByText('R$ 50,00').first()).toBeVisible();
  await expect(page.locator('.sidebar-footer')).toHaveText(pendingBefore!);
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).last().click();
  await page.getByLabel('Valor em reais').fill('0,01');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(page.getByText('R$ 49,99').first()).toBeVisible();
  await expect(page.locator('.sidebar-footer')).toContainText('2 pendentes');
  await page.reload();
  await expect(page.getByText('R$ 49,99').first()).toBeVisible();
  await expect(page.locator('.sidebar-footer')).toContainText('2 pendentes');
  await context.setOffline(false);
});
