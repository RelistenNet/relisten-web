import { defineConfig } from '@timber-js/app';
import { nitro } from '@timber-js/app/adapters/nitro';

export default defineConfig({
  output: 'server',
  adapter: nitro({ preset: 'node-server' }),
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mdx'],
  // pnpm dev:session serves the one local origin the User Service accepts.
  dev: process.env.RELISTEN_WEB_SESSION === '1' ? { hostname: 'web.relisten' } : undefined,
  layoutDefaults: { lifetime: 'document', key: { headers: ['user-agent'] } },
});
