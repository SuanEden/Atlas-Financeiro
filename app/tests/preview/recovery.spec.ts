import { expect, test } from '@playwright/test';
import { recoveryFixture } from '../recovery-fixture';
import { serializeLocalBackup } from '../../src/backup/local-backup';
import { readFileSync } from 'node:fs';

test('produção recupera arquivo I2 offline e preserva histórico e novas pendências após recarga', async ({ page, context }) => {
  const owner = 'd4000000-0000-4000-8000-000000000001';
  const json = serializeLocalBackup(recoveryFixture(owner), owner);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await context.setOffline(true);
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Backup', exact: true }).click();
  await page.getByLabel('Arquivo JSON de I2').setInputFiles({ name: 'synthetic-i2.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(page.locator('.recovery-panel').getByRole('status')).toContainText('Arquivo validado');
  await page.getByRole('checkbox', { name: /Conferi o arquivo/ }).check();
  await page.getByRole('button', { name: 'Confirmar recuperação', exact: true }).click();
  await expect(page.getByLabel('Resumo dos saldos')).toContainText('R$ 998,02');
  await expect(page.locator('.sidebar-footer')).toContainText('10 pendentes');
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).last().click();
  await page.getByLabel('Valor em reais').fill('0,01');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(page.getByLabel('Resumo dos saldos')).toContainText('R$ 998,01');
  await page.reload();
  await expect(page.getByLabel('Resumo dos saldos')).toContainText('R$ 998,01');
  await expect(page.locator('.sidebar-footer')).toContainText('11 pendentes');
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Backup', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar backup' }).click();
  const after = JSON.parse(readFileSync((await (await download).path())!, 'utf8'));
  const before = JSON.parse(json);
  for (const table of ['accounts', 'categories', 'events', 'settlements', 'postings']) {
    for (const row of before.data[table]) expect(after.data[table]).toContainEqual(row);
  }
  for (const operation of before.outbox) expect(after.outbox).toContainEqual(operation);
  expect(after.userId).toBe(owner);
  await context.setOffline(false);
});
