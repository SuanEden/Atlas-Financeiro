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
  await expect(page.locator('.chart-studio-card--wide').getByRole('heading', { name: 'Análise personalizada' })).toBeVisible();

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


test('gráficos compactos se adaptam ao espaço sem quebrar títulos e legendas', async ({ page }) => {
  await page.setViewportSize({ width: 920, height: 900 });
  await page.goto('/');
  const card = page.locator('.chart-studio-card').filter({ has: page.getByRole('heading', { name: 'Despesas pagas por categoria' }) });
  await card.getByRole('button', { name: 'Tamanho de Despesas pagas por categoria' }).click();
  await card.getByRole('button', { name: 'Largura Compacto' }).click();
  await expect(card).toBeVisible();
  const metrics = await card.evaluate((element) => {
    const legend = element.querySelector('.finance-category-legend');
    return {
      width: element.getBoundingClientRect().width,
      titleWidth: element.querySelector('.chart-card-title')?.getBoundingClientRect().width ?? 0,
      visualWidth: element.querySelector('.chart-visual-frame')?.getBoundingClientRect().width ?? 0,
      legendWidth: legend?.getBoundingClientRect().width ?? 0,
    };
  });
  expect(metrics.width).toBeGreaterThanOrEqual(320);
  expect(metrics.titleWidth).toBeGreaterThan(150);
  expect(metrics.visualWidth).toBeGreaterThan(200);
  if (metrics.legendWidth > 0) expect(metrics.legendWidth).toBeGreaterThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
