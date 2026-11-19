import { readFileSync } from 'node:fs';
import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import { request } from 'node:https';
import { join } from 'node:path';
import type { Plugin, ServerOptions } from 'vite';
import { localTlsDir } from './scripts/localTlsDir.mjs';

/**
 * `pnpm dev:session`: serve the one local origin the User Service accepts and
 * forward the browser-session routes to it same-origin, as Traefik does in
 * production and the preview gateway does on previews. Plain `pnpm dev` is
 * unaffected. timber.config.ts sets the printed hostname.
 *
 * Dev-only: this is Vite config, so none of it reaches the production bundle.
 */

const WEB_HOST = 'web.relisten.localhost';
const PORT = 5173;
const WEB_ORIGIN = `https://${WEB_HOST}:${PORT}`;
const USER_SERVICE = new URL('https://accounts.relisten.localhost:5443');
const TIMEOUT_MS = 10_000;

const ROUTES = [/^\/auth\/session(\/|$)/, /^\/api\/user\/v1\/csrf$/, /^\/v1\/me$/];

// Hop-by-hop, plus anything that could influence the User Service's origin reconstruction.
const DROP_REQUEST = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'te',
  'upgrade',
  'forwarded',
]);
// Connection-specific headers are invalid over the dev server's HTTP/2.
const DROP_RESPONSE = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
]);

export function sessionDevServer(
  env: NodeJS.ProcessEnv = process.env
): { server: ServerOptions; plugin: Plugin } | undefined {
  if (!env.RELISTEN_WEB_SESSION) return undefined;

  const dir = localTlsDir(env);
  let cert: Buffer, key: Buffer, ca: Buffer;
  try {
    cert = readFileSync(join(dir, 'relisten-local.pem'));
    key = readFileSync(join(dir, 'relisten-local-key.pem'));
    ca = readFileSync(join(dir, 'ca.pem'));
  } catch {
    throw new Error(
      `Missing dev TLS certificate in ${dir}. Run "pnpm setup:browser-session" first.`
    );
  }

  return {
    server: {
      port: PORT,
      strictPort: true,
      https: { cert, key },
      allowedHosts: [WEB_HOST],
      hmr: { host: WEB_HOST, protocol: 'wss', clientPort: PORT },
    },
    plugin: {
      name: 'relisten-session-forwarding',
      apply: 'serve',
      // Registered before timber's middleware, which would otherwise answer first.
      enforce: 'pre',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const { pathname } = new URL(req.url ?? '/', WEB_ORIGIN);
          if (!ROUTES.some((route) => route.test(pathname))) return next();
          forward(req, res, ca);
        });
      },
    },
  };
}

function forward(req: IncomingMessage, res: ServerResponse, ca: Buffer) {
  const headers: OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(req.headers)) {
    // The dev server speaks HTTP/2, so skip its pseudo-headers (`:method`, `:path`, …).
    if (name.startsWith(':') || DROP_REQUEST.has(name) || name.startsWith('x-forwarded-')) continue;
    headers[name] = value;
  }
  headers['x-relisten-web-origin'] = WEB_ORIGIN;

  const upstream = request(
    new URL(req.url ?? '/', USER_SERVICE),
    { method: req.method, headers, ca, timeout: TIMEOUT_MS },
    (response) => {
      const responseHeaders: OutgoingHttpHeaders = {};
      for (const [name, value] of Object.entries(response.headers)) {
        if (!DROP_RESPONSE.has(name)) responseHeaders[name] = value;
      }
      res.writeHead(response.statusCode ?? 502, responseHeaders);
      response.pipe(res);
    }
  );
  upstream.on('timeout', () =>
    upstream.destroy(Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }))
  );
  upstream.on('error', (err: NodeJS.ErrnoException) => {
    const cause = err.code ?? err.message;
    console.error(`[session-forwarding] ${USER_SERVICE.origin} unreachable: ${cause}`);
    if (res.headersSent) return void res.destroy();
    res.writeHead(502, {
      'cache-control': 'private, no-store',
      'content-type': 'text/plain; charset=utf-8',
    });
    res.end(
      `Session service unavailable at ${USER_SERVICE.origin}: ${cause}\n` +
        'Is RelistenUserService running? See docs/browser-session.md.\n'
    );
  });
  req.pipe(upstream);
}
