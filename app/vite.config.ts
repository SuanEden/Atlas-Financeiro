import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const appRoot = fileURLToPath(new URL('.', import.meta.url));
const privateNames = /(?:^|\/)(?:00_COMECE_AQUI\.md|PROMPT_CODEX\.md|REQUISITOS_ATLAS\.md|REFERENCIAS_E_DECISOES\.md|\.private|\.git|\.env(?:\.[^/]*)?)(?:\/|$)/i;

function protectPrivateDocuments(): Plugin {
  return {
    name: 'atlas-private-documents',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        try {
          let pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
          for (let round = 0; round < 3; round += 1) {
            const decoded = decodeURIComponent(pathname);
            if (decoded === pathname) break;
            pathname = decoded;
          }
          if (privateNames.test(pathname.replaceAll('\\', '/'))) {
            response.statusCode = 404;
            response.end('Não encontrado');
            return;
          }
        } catch {
          response.statusCode = 400;
          response.end('Requisição inválida');
          return;
        }
        next();
      });
    },
  };
}

function offlineShell(): Plugin {
  return {
    name: 'atlas-offline-shell',
    apply: 'build',
    writeBundle(options, bundle) {
      const output = options.dir ?? join(appRoot, 'dist');
      const manifest = JSON.parse(readFileSync(join(output, 'manifest.webmanifest'), 'utf8')) as { icons: { src: string }[] };
      const files = [...new Set(['index.html', 'manifest.webmanifest', ...manifest.icons.map((icon) => icon.src.slice(1)), ...Object.keys(bundle)])];
      const hash = createHash('sha256');
      for (const file of files) hash.update(readFileSync(join(output, file)));
      const template = readFileSync(join(appRoot, 'public/sw.js'), 'utf8');
      const version = hash.update(template).digest('hex').slice(0, 16);
      writeFileSync(join(output, 'sw.js'), template
        .replace('__BUILD_VERSION__', version)
        .replace('[/* __PRECACHE__ */]', JSON.stringify(['/', ...files.map((file) => `/${file}`)])));
    },
  };
}

export default defineConfig({
  root: appRoot,
  plugins: [protectPrivateDocuments(), react(), offlineShell()],
  publicDir: 'public',
  // Browser tests import the persistence harness lazily. Pre-bundle Dexie at
  // server startup so first use cannot trigger a Vite reload mid-evaluation.
  optimizeDeps: { include: ['dexie'] },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      strict: true,
      allow: [appRoot],
      deny: ['**/.env*', '**/.git/**', '**/.private/**', '**/*.md'],
    },
  },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: false },
});
