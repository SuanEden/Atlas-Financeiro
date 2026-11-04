import { expect, test } from '@playwright/test';

test('modo de teste é local e não modifica a base comum', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', request => {
    if (!/^(localhost|127\.0\.0\.1)$/.test(new URL(request.url()).hostname)) remoteRequests.push(request.url());
  });
  await page.goto('/?test=1');
  await expect(page.getByText('Modo de teste · apenas neste navegador')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar minha primeira conta' }).click();
  await page.getByLabel('Nome da conta').fill('Conta fictícia isolada');
  await page.getByPlaceholder('R$ 0,00').fill('100,00');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('R$ 100,00').first()).toBeVisible();
  const ids = await page.evaluate(() => ({
    normal: localStorage.getItem('atlas-financeiro:local-owner:v1'),
    test: localStorage.getItem('atlas-financeiro:test-owner:v1'),
  }));
  expect(ids.test).toMatch(/^[0-9a-f-]{36}$/);
  expect(ids.test).not.toBe(ids.normal);
  await page.goto('/');
  await expect(page.getByText('Comece criando sua primeira conta')).toBeVisible();
  await page.goto('/?test=1');
  await expect(page.getByText('R$ 100,00').first()).toBeVisible();
  expect(remoteRequests).toEqual([]);
});
