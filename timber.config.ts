import { defineConfig } from '@timber-js/app';
import { nitro } from '@timber-js/app/adapters/nitro';
import { MemoryCacheHandler } from '@timber-js/app/cache';

export default defineConfig({
  output: 'server',
  adapter: nitro({ preset: 'node-server' }),
  serverTiming: 'detailed',
  cacheHandler: new MemoryCacheHandler({ maxSize: 500 }),
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mdx'],
  mdx: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});
