import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('fundação renderiza, alterna tema e explica a próxima etapa', async ({ page }, testInfo) => {
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
  await expect(page).toHaveURL('http://127.0.0.1:5173/');
  await expect(page).toHaveTitle('Atlas Financeiro | Fundação local');
  await expect(page.getByRole('heading', { level: 1, name: 'Fundação local' })).toBeVisible();
  await expect(page.getByText('Esta etapa ainda não recebe lançamentos pessoais.')).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  const toggle = page.getByRole('button', { name: 'Usar tema escuro' });
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Usar tema claro' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.getByRole('button', { name: 'Usar tema escuro' })).toHaveAttribute('aria-pressed', 'false');
  await page.locator('summary').click();
  await expect(page.getByText(/Contas, categorias e registro de movimentações/)).toBeVisible();
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
});
