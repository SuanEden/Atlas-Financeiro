import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
    baseURL: 'http://127.0.0.1:5173',
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
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
