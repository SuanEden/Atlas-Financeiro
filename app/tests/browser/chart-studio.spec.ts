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

  await expect(page.getByRole('button', { name: 'Tamanho de Análise personalizada' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Organizar', exact:true }).click();
  // Chart actions only appear in the dedicated edit mode.
  await page.getByRole('button', { name: 'Tamanho de Análise personalizada' }).click();
  const card = page.locator('.chart-studio-card').filter({ has: page.getByRole('heading', { name: 'Análise personalizada' }) });
  await card.getByRole('button', { name: 'Largura Largo' }).click();
  await expect(card).toHaveCSS('grid-column-start', (page.viewportSize()?.width ?? 1280) <= 780 ? '1' : '1');
  await card.getByRole('button', { name: 'Alto' }).click();
  await expect(card).toHaveCSS('min-height', '540px');
  await card.getByRole('button', { name: 'Fechar opções de tamanho' }).click();
  await page.reload();
  const resized = page.locator('.chart-studio-card').filter({ has: page.getByRole('heading', { name: 'Análise personalizada' }) });
  await expect(resized).toHaveCSS('min-height', '540px');

  await page.getByRole('button', { name: 'Organizar', exact:true }).click();
  await page.getByRole('button', { name: 'Mover Análise personalizada para antes' }).click();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await page.reload();
  await expect(page.locator('.chart-studio-card')).toHaveCount(4);
  await expect(page.locator('.chart-studio-card--wide').getByRole('heading', { name: 'Análise personalizada' })).toBeVisible();

  await page.getByRole('button', { name: 'Organizar', exact:true }).click();
  await page.getByRole('button', { name: 'Editar Análise personalizada' }).click();
  await page.getByRole('dialog').getByLabel('Visualização').selectOption('donut');
  await expect(page.getByRole('dialog').locator('.chart-field select').nth(2)).toHaveValue('expense');
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar gráfico' }).click();
  await page.reload();
  await expect(page.locator('.chart-studio-card')).toHaveCount(4);

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Organizar', exact:true }).click();
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
  await page.getByRole('button', { name: 'Organizar', exact:true }).click();
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


test('grade pontilhada aparece somente enquanto arrasta ou redimensiona', async ({ page }) => {
  await page.goto('/');
  const grid = page.locator('.chart-studio-grid');
  await expect(page.getByRole('button', { name: 'Arraste para redimensionar Entradas e saídas realizadas' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Organizar', exact:true }).click();
  const resize = page.getByRole('button', { name: 'Arraste para redimensionar Entradas e saídas realizadas' });
  await expect(grid).not.toHaveClass(/chart-studio-grid--guides/);
  const bounds = await resize.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await expect(grid).toHaveClass(/chart-studio-grid--guides/);
  await expect(grid).toHaveClass(/chart-studio-grid--free/);
  await page.mouse.up();
  await expect(grid).not.toHaveClass(/chart-studio-grid--guides/);
  const handle = page.getByRole('button', { name: 'Posicionar Despesas pagas por categoria' });
  const card = page.locator('.chart-studio-card').filter({ has: page.getByRole('heading', { name: 'Despesas pagas por categoria' }) });
  const yBefore = await card.evaluate(element=>parseInt(getComputedStyle(element).gridRowStart));
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x+box!.width/2, box!.y+box!.height/2);
  await page.mouse.down();
  await page.mouse.move(box!.x+box!.width/2, box!.y+box!.height/2+95, {steps:8});
  await expect(grid).toHaveClass(/chart-studio-grid--guides/);
  await page.mouse.up();
  await expect(grid).not.toHaveClass(/chart-studio-grid--guides/);
  const yAfter = await card.evaluate(element=>parseInt(getComputedStyle(element).gridRowStart));
  expect(yAfter).toBeGreaterThan(yBefore);
  await page.reload();
  const persisted = page.locator('.chart-studio-card').filter({has:page.getByRole('heading',{name:'Despesas pagas por categoria'})});
  await expect(persisted).toHaveCSS('grid-row-start',String(yAfter));
});


test('cada gráfico mantém espaços livres de cinco bolinhas após recarregar',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/');
  await page.getByRole('button',{name:'Organizar',exact:true}).click();
  const first=page.locator('.chart-studio-card').first();
  const start=await first.evaluate(element=>({
    x:parseInt(getComputedStyle(element).gridColumnStart),
    span:parseInt(getComputedStyle(element).gridColumnEnd.replace('span ','')),
  }));
  expect(start.span).toBeGreaterThan(0);
  const handle=page.getByRole('button',{name:'Posicionar Entradas e saídas realizadas'});
  const box=await handle.boundingBox();
  expect(box).not.toBeNull();
  const unit=(await page.locator('.chart-studio-grid').boundingBox())!.width/60;
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
  await page.mouse.down();
  await page.mouse.move(box!.x+box!.width/2+5*unit,box!.y+box!.height/2+600,{steps:12});
  await page.mouse.up();
  const positioned=await first.evaluate(element=>({
    x:parseInt(getComputedStyle(element).gridColumnStart),
    y:parseInt(getComputedStyle(element).gridRowStart),
  }));
  expect(positioned.y).toBeGreaterThan(1);
  await page.reload();
  const restored=await page.locator('.chart-studio-card').first().evaluate(element=>({
    x:parseInt(getComputedStyle(element).gridColumnStart),
    y:parseInt(getComputedStyle(element).gridRowStart),
  }));
  expect(restored).toEqual(positioned);
  await expect(page.locator('.chart-studio-grid')).toHaveClass(/chart-studio-grid--free/);
});
