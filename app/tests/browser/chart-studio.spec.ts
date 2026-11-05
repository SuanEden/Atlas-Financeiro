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
  expect((await card.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(540);
  await card.getByRole('button', { name: 'Fechar opções de tamanho' }).click();
  await page.reload();
  const resized = page.locator('.chart-studio-card').filter({ has: page.getByRole('heading', { name: 'Análise personalizada' }) });
  expect((await resized.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(540);

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


test('a grade de bolinhas aparece no modo organizar e some ao concluir',async({page})=>{
  await page.setViewportSize({width:1440,height:920});
  await page.goto('/');
  const grid=page.locator('.chart-studio-grid');
  await expect(grid).not.toHaveClass(/chart-studio-grid--lattice/);
  await page.getByRole('button',{name:'Organizar',exact:true}).click();
  await expect(grid).toHaveClass(/chart-studio-grid--free/);
  await expect(grid).toHaveClass(/chart-studio-grid--lattice/);
  await expect(page.getByRole('button',{name:'Posicionar Entradas e saídas realizadas'})).toBeVisible();
  await page.getByRole('button',{name:'Concluir',exact:true}).click();
  await expect(grid).not.toHaveClass(/chart-studio-grid--lattice/);
  await page.reload();
  await expect(grid).toHaveClass(/chart-studio-grid--free/);
  await expect(grid).not.toHaveClass(/chart-studio-grid--lattice/);
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


test('editor permite selecionar todas as categorias sem perder o gráfico',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Organizar',exact:true}).click();
  await page.getByRole('button',{name:'Editar Entradas e saídas realizadas'}).click();
  const editor=page.getByRole('dialog');
  await editor.getByRole('group',{name:'Filtrar por conta'}).count();
  await editor.getByLabel('Filtrar por conta: escolher').click();
  const accounts=editor.getByRole('group',{name:'Filtrar por conta'});
  await expect(accounts.getByRole('checkbox',{name:'Todas as contas'})).toBeChecked();
  await editor.getByLabel('Filtrar por categoria: escolher').click();
  const categories=editor.getByRole('group',{name:'Filtrar por categoria'});
  await expect(categories.getByRole('checkbox',{name:'Todas as categorias'})).toBeChecked();
  await expect(editor.getByText('Todas as categorias').first()).toBeVisible();
  await editor.getByRole('button',{name:'Salvar gráfico'}).click();
  await page.reload();
  await page.getByRole('button',{name:'Organizar',exact:true}).click();
  await page.getByRole('button',{name:'Editar Entradas e saídas realizadas'}).click();
  await page.getByRole('dialog').getByLabel('Filtrar por categoria: escolher').click();
  await page.getByRole('dialog').getByLabel('Filtrar por conta: escolher').click();
  await expect(page.getByRole('dialog').getByRole('checkbox',{name:'Todas as categorias'})).toBeChecked();
  await expect(page.getByRole('dialog').getByRole('checkbox',{name:'Todas as contas'})).toBeChecked();
});

test('calendário seleciona intervalo entre meses por arraste e salva', async ({page}) => {
  await page.setViewportSize({width:1440,height:960});
  await page.goto('/');
  await page.getByRole('button',{name:'Novo gráfico'}).click();
  const editor=page.getByRole('dialog');
  await editor.getByLabel('Título do gráfico').fill('Intervalo personalizado');
  await editor.getByLabel('Período').selectOption('custom');
  const calendar=editor.locator('.chart-calendar');
  await expect(calendar).toBeVisible();
  const from=calendar.getByRole('button',{name:'2026-01-20'});
  const to=calendar.getByRole('button',{name:'2026-02-25'});
  // Navigate to January 2026 so both months are visible.
  // The custom preset starts from a preceding month. Use navigation until January is shown.
  for(let i=0;i<24 && !(await calendar.getByRole('button',{name:'2026-01-20'}).count());i++)
    await calendar.getByRole('button',{name:'Meses anteriores'}).click();
  await expect(from).toBeVisible();
  await expect(to).toBeVisible();
  const startBox=await from.boundingBox(),endBox=await to.boundingBox();
  expect(startBox).not.toBeNull();expect(endBox).not.toBeNull();
  await page.mouse.move(startBox!.x+startBox!.width/2,startBox!.y+startBox!.height/2);
  await page.mouse.down();
  await page.mouse.move(endBox!.x+endBox!.width/2,endBox!.y+endBox!.height/2,{steps:16});
  await page.mouse.up();
  await expect(from).toHaveAttribute('aria-pressed','true');
  await expect(to).toHaveAttribute('aria-pressed','true');
  await expect(calendar.getByText('De 20/01/2026 até 25/02/2026')).toBeVisible();
  await editor.getByRole('button',{name:'Salvar gráfico'}).click();
  await page.getByRole('button',{name:'Organizar',exact:true}).click();
  await page.getByRole('button',{name:'Editar Intervalo personalizado'}).click();
  await expect(page.getByRole('dialog').getByLabel('Período')).toHaveValue('custom');
  await expect(page.getByRole('dialog').getByText('De 20/01/2026 até 25/02/2026')).toBeVisible();
  await page.getByRole('dialog').getByLabel('Período').selectOption('3');
  await expect(page.getByRole('dialog').locator('.chart-calendar')).toHaveCount(0);
});

test('calendário permite escolher dias separados e persiste após recarga',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Novo gráfico'}).click();
  const editor=page.getByRole('dialog');
  await editor.getByLabel('Título do gráfico').fill('Dias avulsos');
  await editor.getByLabel('Período').selectOption('days');
  const calendar=editor.locator('.chart-calendar');
  await expect(editor.getByRole('button',{name:'Salvar gráfico'})).toBeDisabled();
  // Select October 15, 20 and 31: not a continuous interval.
  for(let i=0;i<24 && !(await calendar.getByRole('button',{name:'2026-10-31'}).count());i++)
    await calendar.getByRole('button',{name:'Meses anteriores'}).click();
  for(const day of [15,20,31]) {
    await calendar.getByRole('button',{name:'2026-10-'+day}).click();
  }
  await expect(calendar.getByText('3 dias selecionados')).toBeVisible();
  await editor.getByRole('button',{name:'Salvar gráfico'}).click();
  await page.reload();
  await page.getByRole('button',{name:'Organizar',exact:true}).click();
  await page.getByRole('button',{name:'Editar Dias avulsos'}).click();
  await expect(page.getByRole('dialog').getByLabel('Período')).toHaveValue('days');
  await expect(page.getByRole('dialog').getByText('3 dias selecionados')).toBeVisible();
  await page.getByRole('dialog').getByRole('button',{name:'Limpar seleção'}).click();
  await expect(page.getByRole('dialog').getByText('0 dias selecionados')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Salvar gráfico'})).toBeDisabled();
  await page.getByRole('dialog').getByRole('button',{name:'Hoje'}).click();
  await expect(page.getByRole('dialog').locator('.chart-calendar-month')).toHaveCount(2);
});
