import { defineConfig } from 'orval';

export default defineConfig({
  relistenV4: {
    input: { target: './src/lib/v4/swagger.json' },
    output: {
      target: './src/lib/v4/generated/client.ts',
      schemas: './src/lib/v4/generated/model',
      client: 'fetch',
      mode: 'single',
      clean: true,
      override: {
        mutator: { path: './src/lib/v4/fetcher.ts', name: 'relistenFetch' },
      },
    },
  },
});
