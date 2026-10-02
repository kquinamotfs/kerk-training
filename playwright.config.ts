import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  use: {
    baseURL: 'http://localhost:3000',
  },

  webServer: {
    command: 'node sandbox/server.js',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});