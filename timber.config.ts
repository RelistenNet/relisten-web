import { defineConfig } from '@timber-js/app';
import { nitro } from '@timber-js/app/adapters/nitro';

export default defineConfig({
  output: 'server',
  adapter: nitro({
    preset: 'node-server',
    // satteri loads a native binary for the platform it runs on. Bundled, its
    // loader can't find one, so trace it as a package: the output then carries
    // its JS and the platform package installed beside it (musl in the image).
    nitroConfig: { traceDeps: ['satteri*'] },
  }),
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mdx'],
  // pnpm dev:session serves the one local origin the User Service accepts.
  dev: process.env.RELISTEN_WEB_SESSION === '1' ? { hostname: 'web.relisten' } : undefined,
  layoutDefaults: { lifetime: 'document', key: { headers: ['user-agent'] } },
});
