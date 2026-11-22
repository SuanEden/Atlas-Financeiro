import { test, expect } from '@playwright/test';

test('arquivo de planejamento entra na área correta, sem importar como backup financeiro',async({page})=>{
  await page.setViewportSize({width:1440,height:960});
  await page.goto('/?test=1');
  await page.getByRole('button',{name:'Modo nuvem',exact:false}).first().click();
  await expect(page.getByRole('button',{name:'Abrir importação de Planejamento'})).toBeVisible();
  await page.getByRole('button',{name:'Abrir importação de Planejamento'}).click();
  await expect(page.getByRole('heading',{name:'Planejamento financeiro'})).toBeVisible();
  const template={
    schemaVersion:1,ownerId:'import-template',revision:0,
    goals:[{id:'test-goal-01',name:'Meta de teste importada',targetCents:null,deadline:null,priority:'unset',status:'active',allocations:[]}],
    recurrences:[],obligations:[],shared:[],rules:[],accountPreferences:[],eventNecessities:[]
  };
  const input=page.locator('.planning-backup input[type="file"]');
  page.once('dialog',dialog=>dialog.accept());
  await input.setInputFiles({name:'planejamento-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(template))});
  await expect(page.locator('.planning-record strong').getByText('Meta de teste importada', { exact: true })).toBeVisible();
  page.once('dialog',dialog=>dialog.accept());
  await input.setInputFiles({name:'planejamento-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(template))});
  await expect(page.locator('.planning-record strong').getByText('Meta de teste importada', { exact: true })).toHaveCount(1);
  await page.reload();
  await page.locator('.sidebar').getByRole('button',{name:'Planejamento'}).click();
  await expect(page.locator('.planning-record strong').getByText('Meta de teste importada', { exact: true })).toBeVisible();
});
