import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Unit tests only: deliberately not the app's vite.config.ts, so tests don't
// boot the timber plugin (RSC environments, routing, content collections).
export default defineConfig({
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
