import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
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

export default defineConfig({
  root: appRoot,
  plugins: [protectPrivateDocuments(), react()],
  publicDir: false,
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
