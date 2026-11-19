import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ServerOptions } from 'vite';

/**
 * Opt-in dev-server config for browser sessions.
 *
 * The User Service only accepts fixed web origins (https://relisten.net, preview
 * hosts, and https://web.relisten.localhost:5173) and sets `__Host-` cookies, so
 * local session development must run on that exact HTTPS origin with the session
 * routes proxied same-origin. In production Traefik does this routing; in dev
 * src/lib/session/proxy.ts (called from app/proxy.ts) does, because timber's dev
 * middleware runs before Vite's `server.proxy`.
 *
 * Enabled by `pnpm dev:session` (RELISTEN_WEB_SESSION=1).
 * Plain `pnpm dev` is unaffected. timber.config.ts sets the printed hostname.
 */

export function tlsDirectory(env: NodeJS.ProcessEnv = process.env) {
  // Keep in sync with scripts/setup-browser-session.mjs.
  return (
    env.RELISTEN_LOCAL_TLS_DIR ??
    join(homedir(), 'Library', 'Application Support', 'Relisten', 'local-browser-session-tls')
  );
}

export function sessionDevServer(env: NodeJS.ProcessEnv = process.env): ServerOptions | undefined {
  if (!env.RELISTEN_WEB_SESSION) return undefined;

  const dir = tlsDirectory(env);
  let cert: Buffer, key: Buffer;
  try {
    cert = readFileSync(join(dir, 'relisten-local.pem'));
    key = readFileSync(join(dir, 'relisten-local-key.pem'));
  } catch {
    throw new Error(
      `Missing dev TLS certificate in ${dir}. Run "pnpm setup:browser-session" first.`
    );
  }

  return {
    port: 5173,
    strictPort: true,
    https: { cert, key },
    allowedHosts: ['web.relisten.localhost'],
    hmr: { host: 'web.relisten.localhost', protocol: 'wss', clientPort: 5173 },
  };
}
