import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { timber } from '@timber-js/app';
import {
  createBrowserSessionProxyPlugin,
  loadBrowserSessionDevelopmentConfiguration,
  LOCAL_WEB_ORIGIN,
} from './dev/browserSessionDevelopment';

const serverExternals = ['takumi-js', '@takumi-rs/core', '@mdx-js/rollup', 'rollup', 'fsevents'];

export default defineConfig(({ command, isPreview }) => {
  const browserSession =
    command === 'serve' && !isPreview ? loadBrowserSessionDevelopmentConfiguration() : undefined;

  return {
    legacy: {
      inconsistentCjsInterop: true,
    },
    plugins: [
      ...(browserSession === undefined ? [] : [createBrowserSessionProxyPlugin(browserSession)]),
      timber({ reactCompiler: true }),
    ],
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
    server:
      browserSession === undefined
        ? undefined
        : {
            host: '127.0.0.1',
            port: 5173,
            strictPort: true,
            allowedHosts: ['web.relisten.localhost'],
            origin: LOCAL_WEB_ORIGIN,
            https: {
              cert: browserSession.certificate,
              key: browserSession.certificateKey,
            },
            hmr: {
              host: 'web.relisten.localhost',
              protocol: 'wss',
              clientPort: 5173,
            },
          },
  };
});
