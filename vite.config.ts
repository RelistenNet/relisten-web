import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { timber } from '@timber-js/app';

export default defineConfig({
  plugins: [timber({ reactCompiler: true })],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  ssr: {
    external: ['@takumi-rs/image-response'],
  },

});
