import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/admin-content.spec.ts'],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    browserName: 'chromium',
    screenshot: 'off',
  },
  webServer: {
    command: 'pnpm build && node scripts/start-test-server.mjs',
    url: 'http://127.0.0.1:3100/healthz',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
