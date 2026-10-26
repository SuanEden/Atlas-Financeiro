import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, extname } from 'node:path';

test('nova versão espera fechar as abas e mantém contas, histórico e outbox offline', async ({ page, context }) => {
  const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
  let updated = false;
  const server = createServer((request, response) => {
    const pathname = new URL(request.url!, 'http://localhost').pathname;
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (file.includes('..')) { response.writeHead(404).end(); return; }
    try {
      let body: Buffer | string = readFileSync(join(dist, file));
      if (updated && file === 'sw.js') body = body.toString().replace(/(const CACHE_NAME = 'atlas-shell-[^']+)/, '$1-next');
      if (updated && file === 'index.html') body = body.toString().replace('<title>Atlas Financeiro</title>', '<title>Atlas Financeiro atualizado</title>');
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Servidor local indisponível.');
  const url = `http://127.0.0.1:${address.port}/`;
  try {
    await page.goto(url);
    await page.getByRole('button', { name: 'Criar minha primeira conta' }).click();
    await page.getByLabel('Nome da conta').fill('Conta de atualização sintética');
    await page.getByPlaceholder('R$ 0,00').fill('12,34');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('R$ 12,34').first()).toBeVisible();
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.getByRole('button', { name: 'Novo lançamento', exact: true }).last().click();
    await page.getByLabel('Valor em reais').fill('1,23');
    updated = true;
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    });
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).waiting?.state)).toBe('installed');
    await expect(page.getByLabel('Valor em reais')).toHaveValue('1,23');
    await expect(page).toHaveTitle('Atlas Financeiro');
    await page.close();
    const reopened = await context.newPage();
    // Opening the same origin waits for activation; no skipWaiting bypass.
    await reopened.goto(url);
    await expect(reopened).toHaveTitle('Atlas Financeiro atualizado');
    await expect(reopened.getByText('R$ 12,34').first()).toBeVisible();
    await expect(reopened.locator('.sidebar-footer')).toContainText('1 pendente');
    await expect.poll(() => reopened.evaluate(async () => (await caches.keys()).filter((key) => key.startsWith('atlas-shell-')))).toEqual([expect.stringMatching(/-next$/)]);
    await context.setOffline(true);
    await reopened.reload();
    await expect(reopened.getByText('R$ 12,34').first()).toBeVisible();
    await expect(reopened.locator('.sidebar-footer')).toContainText('1 pendente');
    await context.setOffline(false);
    await reopened.close();
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
