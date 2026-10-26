import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function navigate(page: Page, testInfo: TestInfo, destination: 'Início' | 'Movimentações' | 'Contas' | 'Categorias' | 'Backup') {
  if (testInfo.project.name === 'mobile-edge' && destination === 'Movimentações') {
    await page.getByRole('button', { name: 'Movimentos', exact: true }).click();
    return;
  }
  if (testInfo.project.name === 'mobile-edge' && (destination === 'Categorias' || destination === 'Backup')) {
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    if (destination === 'Backup') await page.getByRole('button', { name: 'Backup', exact: true }).click();
    return;
  }
  await page.getByRole('button', { name: destination, exact: true }).click();
}

test('conta, categoria, despesa, correção e backup sobrevivem à recarga', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Criar minha primeira conta' }).click();
  await page.getByLabel('Nome da conta').fill('Conta de teste');
  await page.getByPlaceholder('R$ 0,00').fill('50,00');
  await page.screenshot({ path: join(tmpdir(), `atlas-i2-account-${testInfo.project.name}.png`), fullPage: false });
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('R$ 50,00').first()).toBeVisible();

  await navigate(page, testInfo, 'Categorias');
  await page.getByRole('button', { name: 'Nova categoria' }).click();
  await page.getByLabel('Nome').fill('Mercado de teste');
  await page.screenshot({ path: join(tmpdir(), `atlas-i2-category-${testInfo.project.name}.png`), fullPage: false });
  await page.getByRole('dialog').getByRole('button', { name: 'Criar categoria' }).click();
  await expect(page.getByText('Mercado de teste')).toBeVisible();

  await page.getByRole('button', { name: 'Novo lançamento' }).last().click();
  const transactionDialog = page.getByRole('dialog');
  await transactionDialog.getByLabel('Valor em reais').fill('18,00');
  await expect(transactionDialog.getByRole('combobox').first()).not.toHaveValue('');
  await transactionDialog.getByRole('combobox').nth(1).selectOption({ label: 'Mercado de teste' });
  await transactionDialog.getByLabel(/Descrição/).fill('Compra de teste');
  await page.screenshot({ path: join(tmpdir(), `atlas-i2-form-${testInfo.project.name}.png`), fullPage: true });
  await transactionDialog.getByRole('button', { name: 'Salvar lançamento' }).click();

  await navigate(page, testInfo, 'Início');
  await expect(page.getByText('R$ 32,00').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('R$ 32,00').first()).toBeVisible();

  await navigate(page, testInfo, 'Movimentações');
  await expect(page.getByText('Compra de teste').first()).toBeVisible();
  await page.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Valor em reais').fill('20,00');
  await page.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(page.getByText('Estorno: Compra de teste')).toBeVisible();

  await navigate(page, testInfo, 'Início');
  await expect(page.getByText('R$ 30,00').first()).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), `atlas-i2-dashboard-${testInfo.project.name}.png`), fullPage: true });

  await navigate(page, testInfo, 'Backup');
  await page.screenshot({ path: join(tmpdir(), `atlas-i2-backup-${testInfo.project.name}.png`), fullPage: false });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^atlas-financeiro-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(errors).toEqual([]);
});

test('transferência para reserva mantém o total entre contas', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar minha primeira conta' }).click();
  await page.getByLabel('Nome da conta').fill('Conta livre');
  await page.getByPlaceholder('R$ 0,00').fill('50,00');
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await navigate(page, testInfo, 'Contas');
  await page.getByRole('button', { name: 'Nova conta' }).click();
  const accountDialog = page.getByRole('dialog');
  await accountDialog.getByLabel('Nome da conta').fill('Reserva de teste');
  await accountDialog.getByRole('combobox').nth(1).selectOption('reserved');
  await accountDialog.getByRole('button', { name: 'Criar conta' }).click();

  await page.getByRole('button', { name: 'Transferir ou separar reserva' }).click();
  const transactionDialog = page.getByRole('dialog');
  await transactionDialog.getByRole('button', { name: 'Transferência' }).click();
  await transactionDialog.getByLabel('Valor em reais').fill('10,00');
  await transactionDialog.getByRole('combobox').nth(0).selectOption({ label: 'Conta livre' });
  await transactionDialog.getByRole('combobox').nth(1).selectOption({ label: 'Reserva de teste' });
  await transactionDialog.getByRole('button', { name: 'Salvar lançamento' }).click();

  await navigate(page, testInfo, 'Início');
  const summary = page.getByLabel('Resumo dos saldos');
  await expect(summary).toContainText('R$ 40,00');
  await expect(summary).toContainText('R$ 10,00');
  await expect(summary).toContainText('R$ 50,00');
});
