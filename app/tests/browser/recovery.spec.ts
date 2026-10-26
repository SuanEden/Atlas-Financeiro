import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function backupView(page: Page) {
  const mobile = (page.viewportSize()?.width ?? 1280) < 761;
  const nav = page.getByRole('navigation', { name: mobile ? 'Navegação móvel' : 'Navegação principal' });
  await nav.getByRole('button', { name: mobile ? 'Ajustes' : 'Backup', exact: true }).click();
  if (mobile) await page.getByRole('button', { name: 'Backup', exact: true }).click();
}

async function state(page: Page) {
  return page.evaluate(async () => {
    const path = '/tests/browser-harness.ts';
    return (await import(/* @vite-ignore */ path) as typeof import('../browser-harness')).inspectRecoveryState();
  });
}

async function exported(page: Page) {
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar backup' }).click();
  return readFileSync((await (await downloaded).path())!, 'utf8');
}

async function selectFile(page: Page, json: string) {
  await page.getByLabel('Arquivo JSON de I2').setInputFiles({ name: 'synthetic-i2.json', mimeType: 'application/json', buffer: Buffer.from(json) });
}

test('exportação I2 é recuperada em perfil novo com IDs, histórico e pendências; repetição não duplica', async ({ page, browser }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  const before = await page.evaluate(async () => {
    const path = '/tests/browser-harness.ts';
    return (await import(/* @vite-ignore */ path) as typeof import('../browser-harness')).seedRecoveryFixture();
  });
  await page.reload();
  await expect(page.getByLabel('Resumo dos saldos')).toContainText('R$ 998,02');
  await backupView(page);
  const json = await exported(page);
  const sourceOwner = JSON.parse(json).userId;
  const targetContext = await browser.newContext({ baseURL: info.project.use.baseURL!, viewport: page.viewportSize()! });
  try {
    const target = await targetContext.newPage();
    target.on('pageerror', (error) => errors.push(error.message));
    target.on('console', (message) => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    await target.goto('/');
    await expect(target.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
    const freshOwner = await target.evaluate(() => localStorage.getItem('atlas-financeiro:local-owner:v1'));
    expect(freshOwner).not.toBe(sourceOwner);
    await backupView(target);
    await selectFile(target, json);
    await expect(target.locator('.recovery-panel').getByRole('status')).toContainText('Arquivo validado: 2 contas');
    expect(await target.evaluate(() => localStorage.getItem('atlas-financeiro:local-owner:v1'))).toBe(freshOwner);
    expect(JSON.parse(await state(target)).data.accounts).toEqual([]);
    await target.getByRole('checkbox', { name: /Conferi o arquivo/ }).check();
    await target.screenshot({ path: join(tmpdir(), `atlas-i3-recovery-${info.project.name}.png`), fullPage: true });
    await target.getByRole('button', { name: 'Confirmar recuperação', exact: true }).click();
    await expect(target.getByLabel('Resumo dos saldos')).toContainText('R$ 998,02');
    expect(await state(target)).toBe(before);
    expect(await state(page)).toBe(before);
    expect(await target.evaluate(() => localStorage.getItem('atlas-financeiro:local-owner:v1'))).toBe(sourceOwner);
    await backupView(target);
    const after = JSON.parse(await exported(target));
    expect(after.data).toEqual(JSON.parse(json).data);
    expect(after.outbox).toEqual(JSON.parse(json).outbox);
    await selectFile(target, json);
    await target.getByRole('checkbox', { name: /Conferi o arquivo/ }).check();
    await target.getByRole('button', { name: 'Confirmar recuperação', exact: true }).click();
    await expect(target.getByLabel('Resumo dos saldos')).toContainText('R$ 998,02');
    expect(await state(target)).toBe(before);
    await target.reload();
    expect(await state(target)).toBe(before);
    expect(errors).toEqual([]);
  } finally { await targetContext.close(); }
});

test('arquivo inválido e destino ocupado são recusados sem alterar dados', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  await page.evaluate(async () => {
    const path = '/tests/browser-harness.ts';
    await (await import(/* @vite-ignore */ path) as typeof import('../browser-harness')).seedRecoveryFixture();
  });
  await page.reload();
  await backupView(page);
  const before = await state(page);
  const json = await exported(page);
  const invalid = JSON.parse(json);
  invalid.data.postings[0].amountCents = 100;
  await selectFile(page, JSON.stringify(invalid));
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar recuperação' })).toHaveCount(0);
  expect(await state(page)).toBe(before);
  // Different valid namespace, intentionally no merge or owner replacement.
  const other = json.replaceAll(JSON.parse(json).userId, 'e3000000-0000-4000-8000-000000000001');
  await selectFile(page, other);
  await expect(page.locator('.recovery-panel').getByRole('status')).toContainText('Arquivo validado');
  await page.getByRole('checkbox', { name: /Conferi o arquivo/ }).check();
  await page.getByRole('button', { name: 'Confirmar recuperação', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('já contém dados');
  expect(await state(page)).toBe(before);
});

test('falha final da recuperação reverte financeiro e outbox no IndexedDB nativo', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/tests/browser-harness.ts';
    return (await import(/* @vite-ignore */ path) as typeof import('../browser-harness')).proveNativeRecoveryRollback();
  });
  expect(result.rejected).toBe(true);
  expect(result.failed).toBe(true);
  expect(result.earlierWrites).toBeGreaterThan(0);
  expect(result.counts).toEqual([0, 0, 0, 0, 0, 0]);
});
