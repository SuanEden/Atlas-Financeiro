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
  const toggle = page.getByRole('button', { name: 'Usar tema escuro' });
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Usar tema claro' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.getByRole('button', { name: 'Usar tema escuro' })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), `atlas-financeiro-${testInfo.project.name}.png`), fullPage: true });
  expect(errors).toEqual([]);
  expect(remoteRequests).toEqual([]);
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
