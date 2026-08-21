import { defineConfig } from '@timber-js/app';
import { nitro } from '@timber-js/app/adapters/nitro';

export default defineConfig({
  output: 'server',
  adapter: nitro({ preset: 'node-server' }),
  serverTiming: 'detailed',
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mdx'],
  mdx: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
  clientSegmentCache: true,
});
