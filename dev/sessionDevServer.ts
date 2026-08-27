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
 * Plain `pnpm dev` is unaffected. The actual path forwarding lives in
 * src/lib/session/proxy.ts (called from app/proxy.ts): timber's dev middleware
 * runs before Vite's `server.proxy`, so a Vite-level proxy never sees these requests.
 */

export const LOCAL_WEB_ORIGIN = 'https://web.relisten.localhost:5173';

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

  return {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    https: { cert, key },
    allowedHosts: ['web.relisten.localhost'],
    origin: LOCAL_WEB_ORIGIN,
    hmr: { host: 'web.relisten.localhost', protocol: 'wss', clientPort: 5173 },
  };
}
