import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests only: deliberately not the app's vite.config.ts, so tests don't
// boot the timber plugin (RSC environments, routing, content collections).
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      // src/data modules import 'server-only', which throws outside a
      // react-server build; tests import their pure conversions directly.
      'server-only': resolve(import.meta.dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
