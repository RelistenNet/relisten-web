import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { timber } from '@timber-js/app';

export default defineConfig({
  plugins: [timber()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
    // Force single React instance — linked @timber-js/app has its own react
    // in node_modules, which creates duplicate React.cache scopes.
    dedupe: ['react', 'react-dom'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  ssr: {
    external: ['@takumi-rs/image-response'],
  },
});
