import { defineConfig } from 'orval';

export default defineConfig({
  relistenV4: {
    input: { target: './src/api/swagger.json' },
    output: {
      target: './src/api/generated/client.ts',
      schemas: './src/api/generated/model',
      client: 'fetch',
      mode: 'single',
      clean: true,
      override: {
        mutator: { path: './src/api/fetcher.ts', name: 'relistenFetch' },
      },
    },
    hooks: { afterAllFilesWrite: 'node scripts/gen-artist-features.mjs' },
  },
});
