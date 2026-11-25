import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true, workers: 3,
  reporter: 'list', use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', screenshot: 'off' },
});
