import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: [['line']],
  outputDir: '.test-results/browser-session',
  use: {
    baseURL: 'https://web.relisten.localhost:5173',
    ignoreHTTPSErrors: false,
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: {
      args: [
        '--host-resolver-rules=MAP web.relisten.localhost 127.0.0.1, MAP auth.relisten.localhost 127.0.0.1, MAP accounts.relisten.localhost 127.0.0.1',
      ],
    },
  },
});
