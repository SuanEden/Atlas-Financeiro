import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('dashboard local renderiza, alterna tema e mantém o primeiro uso vazio', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const remoteRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (!new URL(request.url()).hostname.match(/^(127\.0\.0\.1|localhost)$/)) remoteRequests.push(request.url());
  });

  await page.goto('/');
  await expect(page).toHaveURL(new URL('/', testInfo.project.use.baseURL!).href);
  await expect(page).toHaveTitle('Atlas Financeiro');
  await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
  await expect(page.getByText('Comece criando sua primeira conta')).toBeVisible();
  await expect(page.getByText('R$ 0,00').first()).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme','dark');
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.getByRole('button', { name: 'Usar tema escuro' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Usar tema escuro' }).click();
  await expect(page.getByRole('button', { name: 'Usar tema claro' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), `atlas-financeiro-${testInfo.project.name}.png`), fullPage: true });
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
});

test('modo local preservado e nuvem acessível apenas por escolha explícita',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Visão geral'})).toBeVisible();
  await expect(page.locator('.sidebar-cloud-hint')).toContainText('Dados neste dispositivo');
  await expect(page.getByRole('heading',{name:'Atlas Financeiro'})).toHaveCount(0);
});

test('aba Bancos aparece e funciona na navegação móvel sem perder Ajustes',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-edge','Somente interface móvel');
  await page.goto('/');
  const nav=page.getByRole('navigation',{name:'Navegação móvel'});
  const more=nav.getByRole('button',{name:'Mais',exact:true});
  const banks=nav.getByRole('button',{name:'Bancos',exact:true});
  await expect(more).toBeVisible();
  await expect(banks).toBeVisible();
  await banks.click();
  await expect(page.getByRole('heading',{name:'Bancos conectados'})).toBeVisible();
  await more.click();
  await page.getByRole('button',{name:'Modo nuvem',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sincronização',exact:true})).toBeVisible();
  await expect(page.locator('.cloud-hub')).toContainText('Dados locais preservados');
  await expect(page.locator('.cloud-hub').getByRole('link',{name:'Abrir configuração da nuvem (I3)'})).toBeVisible();
  const noHorizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth);
  expect(noHorizontalOverflow).toBe(true);
});

test('documentos, cópias privadas e Git não são servidos', async ({ request }) => {
  const originals = ['00_COMECE_AQUI.md', 'PROMPT_CODEX.md', 'REQUISITOS_ATLAS.md', 'REFERENCIAS_E_DECISOES.md'];
  const workspace = fileURLToPath(new URL('../../..', import.meta.url)).replaceAll('\\', '/').replace(/\/$/, '');
  const paths = [
    ...originals.flatMap((filename) => [`/${filename}`, `/@fs/${workspace}/${filename}`, `/%52EQUISITOS_ATLAS.md?original=${filename}`]),
    '/.private/originais/2026-10-24-incremento-1/manifest.json',
    `/.git/config`,
    '/.env',
    '/@fs/' + workspace + '/.private/originais/2026-10-24-incremento-1/manifest.json',
  ];
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(await response.text()).toBe('Não encontrado');
  }
  expect((await request.get(`/@fs/${workspace}/.gitignore`)).status()).toBe(403);
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.status()).toBe(200);
  expect(await manifest.json()).toMatchObject({ name: 'Atlas Financeiro', display: 'standalone' });
});
