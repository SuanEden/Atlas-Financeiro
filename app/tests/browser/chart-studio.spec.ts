import { expect, test } from '@playwright/test';

test('painel de gráficos permite criar, configurar, organizar, persistir e excluir', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Gráficos financeiros' })).toBeVisible();
  await expect(page.locator('.chart-studio-card')).toHaveCount(3);

  await page.getByRole('button', { name: 'Novo gráfico' }).click();
  const editor = page.getByRole('dialog');
  await expect(editor).toBeVisible();
  await editor.getByLabel('Título do gráfico').fill('Análise personalizada');
  await editor.getByLabel('Visualização').selectOption('line');
  await editor.locator('.chart-field select').nth(2).selectOption('expense');
  await editor.getByLabel('Agrupar por').selectOption('account');
  await editor.getByLabel('Período').selectOption('3');
  await editor.getByLabel('Tamanho').selectOption('compact');
  await editor.getByRole('button', { name: 'Salvar gráfico' }).click();
  await expect(page.locator('.chart-studio-card')).toHaveCount(4);
  await expect(page.locator('.chart-studio-card--compact').getByRole('heading', { name: 'Análise personalizada' })).toBeVisible();

  // The size option must be visible on the card, not hidden in the data editor.
  await page.getByRole('button', { name: 'Tamanho de Análise personalizada' }).click();
  const card = page.locator('.chart-studio-card').filter({ has: page.getByRole('heading', { name: 'Análise personalizada' }) });
  await card.getByRole('button', { name: 'Largura Largo' }).click();
  await expect(card).toHaveCSS('grid-column-start', (page.viewportSize()?.width ?? 1280) <= 760 ? '1' : 'span 12');
  await card.getByRole('button', { name: 'Alto' }).click();
  await expect(card).toHaveCSS('min-height', '540px');
  await card.getByRole('button', { name: 'Fechar opções de tamanho' }).click();
  await page.reload();
  const resized = page.locator('.chart-studio-card').filter({ has: page.getByRole('heading', { name: 'Análise personalizada' }) });
  await expect(resized).toHaveCSS('min-height', '540px');

  await page.getByRole('button', { name: 'Organizar' }).click();
  await page.getByRole('button', { name: 'Mover Análise personalizada para antes' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.reload();
  await expect(page.locator('.chart-studio-card')).toHaveCount(4);
  await expect(page.locator('.chart-studio-card--compact').getByRole('heading', { name: 'Análise personalizada' })).toBeVisible();

  await page.getByRole('button', { name: 'Editar Análise personalizada' }).click();
  await page.getByRole('dialog').getByLabel('Visualização').selectOption('donut');
  await expect(page.getByRole('dialog').locator('.chart-field select').nth(2)).toHaveValue('expense');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar gráfico' }).click();
  await page.reload();
  await expect(page.locator('.chart-studio-card')).toHaveCount(4);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir Análise personalizada' }).click();
  await expect(page.locator('.chart-studio-card')).toHaveCount(3);
  await page.reload();
  await expect(page.locator('.chart-studio-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
