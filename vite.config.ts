import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { timber } from '@timber-js/app';

const serverExternals = ['takumi-js', '@takumi-rs/core', '@mdx-js/rollup', 'rollup', 'fsevents'];

// Oldest browsers we support, listed on /about. Tailwind v4's CSS
// (@property, color-mix(), cascade layers) sets the floor; Vite's default
// JS target is the same except Firefox, which Tailwind raises to 128.
// Keep this and the About page in sync.
const browserTarget = ['chrome111', 'edge111', 'firefox128', 'safari16.4', 'ios16.4'];

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
    client: {
      build: {
        target: browserTarget,
        cssTarget: browserTarget,
      },
    },
    rsc: {
      resolve: {
        external: serverExternals,
      },
    },
  },
  server: {
    strictPort: false,
  },
});
