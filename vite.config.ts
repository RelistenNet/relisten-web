import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { timber } from '@timber-js/app';
import { sessionDevServer } from './dev/sessionDevServer';

const serverExternals = ['takumi-js', '@takumi-rs/core', '@mdx-js/rollup', 'rollup', 'fsevents'];

export default defineConfig({
  legacy: {
    inconsistentCjsInterop: true,
  },
  plugins: [timber({ reactCompiler: true })],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  ssr: {
    external: serverExternals,
  },
  environments: {
    rsc: {
      resolve: {
        external: serverExternals,
      },
    },
  },
  // Opt-in HTTPS origin + same-origin session proxy (pnpm dev:session).
  server: sessionDevServer() ?? { strictPort: false },
});
