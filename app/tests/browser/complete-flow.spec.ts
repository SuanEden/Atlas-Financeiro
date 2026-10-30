import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function navigate(page: Page, destination: string) {
  const mobile = (page.viewportSize()?.width ?? 1280) < 761;
  const nav = page.getByRole('navigation', { name: mobile ? 'Navegação móvel' : 'Navegação principal' });
  const label = mobile ? ({ Movimentações: 'Movimentos', Backup: 'Ajustes', Categorias: 'Ajustes' }[destination] ?? destination) : destination;
  await nav.getByRole('button', { name: label, exact: true }).click();
  if (mobile && destination === 'Backup') await page.getByRole('button', { name: 'Backup', exact: true }).click();
}

async function record(page: Page, kind: string, amount: string, description: string, planned = false, repeated = false) {
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).last().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: kind, exact: true }).click();
  await dialog.getByLabel('Valor em reais').fill(amount);
  await dialog.getByLabel(/Descrição/).fill(description);
  if (planned) {
    await dialog.getByText('Mais detalhes', { exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Status', exact: true }).selectOption('planned');
    await dialog.getByRole('combobox', { name: 'Certeza', exact: true }).selectOption('estimated');
  }
  if (repeated) await dialog.locator('form').evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  else await dialog.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(dialog).toHaveCount(0);
}

test('receitas, previsões, realização, estorno, exportação e reabertura preservam centavos e histórico', async ({ page, context }, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  await page.clock.setFixedTime(new Date('2026-02-14T12:00:00Z'));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await page.getByRole('button', { name: 'Criar minha primeira conta' }).click();
  await page.getByLabel('Nome da conta').fill('Conta do fluxo sintético');
  await page.getByPlaceholder('R$ 0,00').fill('100,00');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await navigate(page, 'Categorias');
  await page.getByRole('button', { name: 'Nova categoria' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Categoria sintética');
  await page.getByLabel('Natureza').selectOption('both');
  await page.getByRole('dialog').getByRole('button', { name: 'Criar categoria', exact: true }).click();
  await page.getByRole('button', { name: 'Novo lançamento', exact: true }).last().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Valor em reais')).toBeFocused();
  for (let index = 0; index < 18; index++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await dialog.getByLabel('Valor em reais').fill('1,234');
  await dialog.getByRole('button', { name: 'Salvar lançamento' }).click();
  await expect(dialog.getByRole('alert')).toContainText('formato brasileiro');
  await page.screenshot({ path: join(tmpdir(), `atlas-i2-error-${info.project.name}.png`), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Novo lançamento', exact: true }).last()).toBeFocused();

  await record(page, 'Receita', '25,01', 'Receita sintética', false, true);
  await record(page, 'Despesa', '5,02', 'Despesa sintética');
  await record(page, 'Despesa', '12,99', 'Despesa prevista sintética', true);
  await record(page, 'Receita', '50,02', 'Receita prevista sintética', true);
  await navigate(page, 'Início');
  await expect(page.getByLabel('Resumo dos saldos')).toContainText('R$ 119,99');
  await expect(page.locator('.flow-band')).toContainText('R$ 25,01');
  await expect(page.locator('.flow-band')).toContainText('R$ 5,02');
  await navigate(page, 'Movimentações');
  const forecast = page.locator('.history-row').filter({ has: page.getByText('Despesa prevista sintética', { exact: true }) });
  await forecast.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Valor em reais').fill('13,00');
  await page.getByText('Mais detalhes', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('realized');
  await page.getByRole('button', { name: 'Salvar correção' }).click();
  for (const description of ['Despesa sintética', 'Receita sintética', 'Receita prevista sintética']) {
    const row = page.locator('.history-row').filter({ has: page.getByText(description, { exact: true }) });
    await row.getByRole('button', { name: 'Estornar' }).click();
    await expect(page.getByRole('dialog')).toContainText('não será apagado');
    await page.screenshot({ path: join(tmpdir(), `atlas-i2-confirm-${info.project.name}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Estornar lançamento', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await expect(page.getByText('Estorno: Despesa sintética', { exact: true })).toBeVisible();
  await expect(page.getByText('Cancelamento: Receita prevista sintética', { exact: true })).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), `atlas-i2-history-${info.project.name}.png`), fullPage: true });
  await navigate(page, 'Início');
  await expect(page.getByLabel('Resumo dos saldos')).toContainText('R$ 87,00');
  await expect(page.locator('.flow-band')).toContainText('R$ 0,00');
  await expect(page.locator('.flow-band')).toContainText('R$ 13,00');
  await navigate(page, 'Backup');
  await expect(page.getByText('Restauração completa ainda não disponível', { exact: true })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar backup' }).click();
  const file = await (await downloaded).path();
  const backup = JSON.parse(readFileSync(file!, 'utf8'));
  expect(backup.manifest).toMatchObject({ accounts: 1, categories: 1, events: 9, settlements: 6, pendingOperations: 10 });
  expect(backup.data.events.filter((event: { description: string }) => event.description === 'Receita sintética')).toHaveLength(1);
  expect(backup.data.postings.reduce((sum: bigint, posting: { amountCents: string }) => sum + BigInt(posting.amountCents), 0n)).toBe(8700n);
  const savedOwner = await page.evaluate(() => localStorage.getItem('atlas-financeiro:local-owner:v1'));
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.getByLabel('Resumo dos saldos')).toContainText('R$ 87,00');
  expect(await reopened.evaluate(() => localStorage.getItem('atlas-financeiro:local-owner:v1'))).toBe(savedOwner);
  await navigate(reopened, 'Movimentações');
  await expect(reopened.getByText('10 operações locais pendentes', { exact: true })).toBeVisible();
  await expect(reopened.locator('.history-row')).toHaveCount(9);
  const otherTab = await context.newPage();
  await otherTab.goto('/');
  await navigate(otherTab, 'Contas');
  await otherTab.getByRole('button', { name: 'Nova conta', exact: true }).click();
  await otherTab.getByLabel('Nome da conta').fill('Conta de outra aba sintética');
  await otherTab.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await expect(otherTab.getByRole('dialog')).toHaveCount(0);
  await otherTab.close();
  // The first tab still holds an older UI snapshot; export must read IndexedDB now.
  await navigate(reopened, 'Backup');
  const latestDownload = reopened.waitForEvent('download');
  await reopened.getByRole('button', { name: 'Baixar backup' }).click();
  const latestFile = await (await latestDownload).path();
  const latestBackup = JSON.parse(readFileSync(latestFile!, 'utf8'));
  expect(latestBackup.manifest).toMatchObject({ accounts: 2, events: 9, pendingOperations: 11 });
  expect(errors).toEqual([]);
});
