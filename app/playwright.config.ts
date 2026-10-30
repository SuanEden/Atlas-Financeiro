import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Allow isolated QA without replacing the user's live integration server.
const testPort = Number(process.env.ATLAS_BROWSER_TEST_PORT ?? '5173');
if (!Number.isInteger(testPort) || testPort < 1024 || testPort > 65535) throw new Error('Invalid browser test port');
const baseURL = `http://127.0.0.1:${testPort}`;

// Browser plugin not available. Use the installed Edge through Playwright;
// no browser download, cloud service, trace or HTML report is required.
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 30_000,
  reporter: 'list',
  outputDir: join(tmpdir(), 'atlas-financeiro-e2e', `run-${process.pid}`),
  use: {
    baseURL,
    browserName: 'chromium',
    channel: 'msedge',
    trace: 'off',
    screenshot: 'off',
  },
  projects: [
    { name: 'desktop-edge', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile-edge', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host=127.0.0.1 --port=${testPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
