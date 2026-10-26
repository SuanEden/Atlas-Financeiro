import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const appRoot = fileURLToPath(new URL('..', import.meta.url));

describe('PWA local', () => {
  it('declara manifesto instalável sem serviços externos', () => {
    const manifest = JSON.parse(readFileSync(join(appRoot, 'public/manifest.webmanifest'), 'utf8')) as Record<string, unknown>;
    expect(manifest).toMatchObject({ name: 'Atlas Financeiro', start_url: '/', scope: '/', display: 'standalone' });
    expect(JSON.stringify(manifest)).not.toMatch(/https?:\/\//);
  });

  it('mantém cache offline separado do IndexedDB financeiro', () => {
    const worker = readFileSync(join(appRoot, 'public/sw.js'), 'utf8');
    expect(worker).toContain("const CACHE_NAME = 'atlas-shell-v1'");
    expect(worker).toContain("caches.match('/')");
    expect(worker).not.toMatch(/indexedDB|deleteDatabase|\.clear\(/);
  });
});
