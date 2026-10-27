import { expect, test, type Page } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

async function syntheticApp(page:Page) {
  await page.route('**/src/main.tsx',route=>route.fulfill({contentType:'application/javascript',body:"import '/tests/auth-browser-entry.tsx';"}));
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Entrar com Google',exact:true})).toBeVisible();
}
async function navigateBackup(page:Page) {
  const mobile=(page.viewportSize()?.width??1280)<761;
  const nav=page.getByRole('navigation',{name:mobile?'Navegação móvel':'Navegação principal'});
  await nav.getByRole('button',{name:mobile?'Ajustes':'Backup',exact:true}).click();
  if(mobile)await page.getByRole('button',{name:'Backup',exact:true}).click();
}
test('Auth sintético: associação explícita, expiração offline, exportação I3 e logout bloqueiam sem apagar',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(message.text());});
  await syntheticApp(page);
  expect(new URL(page.url()).pathname).toBe('/');await expect(page).toHaveTitle('Atlas Financeiro');
  await expect(page.getByRole('heading',{name:'Visão geral'})).toHaveCount(0);
  await page.getByRole('button',{name:'Entrar com Google',exact:true}).click();
  await expect(page.getByRole('button',{name:'Iniciar uma base vazia'})).toBeDisabled();
  await page.getByRole('checkbox',{name:/Conferi a conta/}).check();
  await page.getByRole('button',{name:'Iniciar uma base vazia'}).click();
  await expect(page.getByRole('heading',{name:'Visão geral'})).toBeVisible();
  await page.getByRole('button',{name:'Criar minha primeira conta'}).click();
  await page.getByLabel('Nome da conta').fill('Conta sintética de sessão');
  await page.getByRole('dialog').getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Nova conta'})).toHaveCount(0);
  await page.evaluate(async()=>{const path='/tests/auth-browser-entry.tsx';await (await import(/* @vite-ignore */path) as typeof import('../auth-browser-entry')).expireAndDisconnect();});
  await expect(page.getByText('Acesso offline',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Sincronizar agora'})).toBeDisabled();
  await page.reload();await expect(page.getByRole('heading',{name:'Visão geral'})).toBeVisible();
  await expect(page.getByText('Conta sintética de sessão',{exact:true})).toBeVisible();
  await navigateBackup(page);
  await expect(page.getByRole('heading',{name:'Cópia de sincronização I3'})).toBeVisible();
  await expect(page.locator('.scope-panel').filter({has:page.getByRole('heading',{name:'Cópia de sincronização I3'})})).toContainText('O importador I2 não aceita este formato');
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await page.screenshot({path:join(tmpdir(),`atlas-i3-backup-safety-${info.project.name}.png`),fullPage:false});
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar backup'}).click();
  const json=readFileSync((await (await download).path())!,'utf8');const backup=JSON.parse(json);
  expect(backup).toMatchObject({format:'atlas-financeiro-sync-backup',meta:{cursor:'1',binding:'active'}});
  expect(backup.pending).toHaveLength(1);expect(backup.receipts).toHaveLength(1);
  const snapshot=await page.evaluate(async()=>{const path='/tests/auth-browser-entry.tsx';return (await import(/* @vite-ignore */path) as typeof import('../auth-browser-entry')).inspect();});
  expect(backup.serverId).toBe('synthetic-browser');expect(backup.pending).toEqual(snapshot.pending);
  expect(backup.receipts).toEqual(snapshot.receipts);expect(backup.meta).toEqual(snapshot.meta);
  expect(backup.confirmed.accounts).toEqual([]);
  expect(backup.projection.accounts).toEqual(snapshot.projection!.accounts);
  expect(backup.pending[0].envelope.operation.payload.accounts).toEqual(backup.projection.accounts);
  expect(json).not.toMatch(/access_token|refresh_token|provider_token/);
  await expect(page.getByLabel('Arquivo JSON de I2')).toHaveCount(0);
  await page.getByRole('button',{name:'Sair e bloquear',exact:true}).click();
  await expect(page.getByRole('button',{name:'Entrar com Google',exact:true})).toBeVisible();
  await expect(page.getByText('Conta sintética de sessão',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.screenshot({path:join(tmpdir(),`atlas-i3-locked-${info.project.name}.png`),fullPage:true});
  await page.reload();await expect(page.getByRole('button',{name:'Entrar com Google',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Visão geral'})).toHaveCount(0);
  await page.evaluate(()=>localStorage.removeItem('synthetic-offline'));
  await page.getByRole('button',{name:'Entrar com Google',exact:true}).click();
  await expect(page.getByText('Conta sintética de sessão',{exact:true})).toBeVisible();
  await navigateBackup(page);
  const repeatedDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Baixar backup'}).click();
  const {exportedAt:_later,...reopenedCopy}=JSON.parse(readFileSync((await (await repeatedDownload).path())!,'utf8'));
  const {exportedAt:_earlier,...initialCopy}=backup;expect(reopenedCopy).toEqual(initialCopy);
  await page.getByRole('button',{name:'Sincronizar agora'}).click();
  await expect(page.getByRole('region',{name:'Sincronização'})).toContainText('Alterações confirmadas');
  const confirmed=await page.evaluate(async()=>{const path='/tests/auth-browser-entry.tsx';return (await import(/* @vite-ignore */path) as typeof import('../auth-browser-entry')).inspect();});
  expect(confirmed.pending).toEqual([]);expect(confirmed.meta?.cursor).toBe('2');
  expect(confirmed.confirmed?.accounts).toEqual(backup.projection.accounts);
  await page.screenshot({path:join(tmpdir(),`atlas-i3-session-${info.project.name}.png`),fullPage:true});
  expect(errors).toEqual([]);
});

test('logout na segunda aba remove a visão da primeira sem apagar o namespace',async({page,context})=>{
  await syntheticApp(page);await page.getByRole('button',{name:'Entrar com Google',exact:true}).click();
  await page.getByRole('checkbox',{name:/Conferi a conta/}).check();await page.getByRole('button',{name:'Iniciar uma base vazia'}).click();
  await expect(page.getByRole('heading',{name:'Visão geral'})).toBeVisible();
  const second=await context.newPage();await second.route('**/src/main.tsx',route=>route.fulfill({contentType:'application/javascript',body:"import '/tests/auth-browser-entry.tsx';"}));
  await second.goto('/');await expect(second.getByRole('heading',{name:'Visão geral'})).toBeVisible();
  await second.getByRole('button',{name:'Sair e bloquear',exact:true}).click();
  await expect(page.getByRole('button',{name:'Entrar com Google',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Visão geral'})).toHaveCount(0);
  const names=await page.evaluate(async()=> (await indexedDB.databases()).map(db=>db.name));
  expect(names.some(name=>name?.startsWith('atlas-financeiro:sync:v1:synthetic-browser:'))).toBe(true);
});
