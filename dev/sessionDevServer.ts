import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ServerOptions } from 'vite';

/**
 * Opt-in dev-server config for browser sessions.
 *
 * The User Service only accepts two web origins (https://relisten.net and
 * https://web.relisten.localhost:5173) and sets `__Host-` cookies, so local
 * session development must run on that exact HTTPS origin with the session
 * routes proxied same-origin. In production Traefik does this routing; in
 * dev Vite's built-in proxy does.
 *
 * Enabled by `pnpm dev:session` (RELISTEN_WEB_SESSION=local|production).
 * Plain `pnpm dev` is unaffected.
 */

export const LOCAL_WEB_ORIGIN = 'https://web.relisten.localhost:5173';
const LOCAL_USER_SERVICE = 'https://accounts.relisten.localhost:5443';

export const SESSION_PROXY_ROUTES = [
  '^/auth/session(/|$)',
  '^/api/user/v1/csrf$',
  '^/v1/me$',
  '^/v1/library(/|$)',
];

export function tlsDirectory(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.RELISTEN_LOCAL_TLS_DIR ??
    join(homedir(), 'Library', 'Application Support', 'Relisten', 'dev-tls')
  );
}

export function sessionDevServer(env: NodeJS.ProcessEnv = process.env): ServerOptions | undefined {
  const mode = env.RELISTEN_WEB_SESSION;
  if (!mode) return undefined;
  if (mode !== 'local' && mode !== 'production') {
    throw new Error('RELISTEN_WEB_SESSION must be "local" or "production".');
  }

  const dir = tlsDirectory(env);
  let cert: Buffer, key: Buffer;
  try {
    cert = readFileSync(join(dir, 'relisten-local.pem'));
    key = readFileSync(join(dir, 'relisten-local-key.pem'));
  } catch {
    throw new Error(`Missing dev TLS certificate in ${dir}. Run "pnpm setup:dev-session" first.`);
  }

  const target = mode === 'local' ? LOCAL_USER_SERVICE : 'https://relisten.net';

  return {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    https: { cert, key },
    allowedHosts: ['web.relisten.localhost'],
    origin: LOCAL_WEB_ORIGIN,
    hmr: { host: 'web.relisten.localhost', protocol: 'wss', clientPort: 5173 },
    proxy: Object.fromEntries(
      SESSION_PROXY_ROUTES.map((route) => [
        route,
        {
          target,
          changeOrigin: true,
          // Node trusts the mkcert CA via --use-system-ca (see the dev:session script).
          secure: true,
          followRedirects: false,
          // Lowercase on purpose: incoming header keys are lowercase, so this
          // overwrites a browser-supplied value instead of sending two.
          headers: { 'x-relisten-web-origin': LOCAL_WEB_ORIGIN },
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              // The User Service rejects requests carrying stray relay/forwarding headers.
              for (const name of proxyReq.getHeaderNames()) {
                if (name === 'forwarded' || name.startsWith('x-forwarded-')) {
                  proxyReq.removeHeader(name);
                }
              }
            });
          },
        },
      ])
    ),
  };
}
