import 'server-only';

import { USER_SERVICE_TIMEOUT_MS, USER_SERVICE_URL, WEB_ORIGIN_HEADER, webOrigin } from './config';

/**
 * Same-origin forwarding of the browser-session routes to the User Service.
 *
 * In production Traefik routes these paths before they reach timber, and on
 * previews the preview gateway does. In local development (`pnpm dev:session`)
 * this runs from app/proxy.ts instead. It has to live here rather than in Vite's
 * `server.proxy`, because timber's dev middleware handles requests first.
 */

// Only forward when explicitly in a session dev mode.
const TARGET = process.env.RELISTEN_WEB_SESSION ? USER_SERVICE_URL : null;

// Matches the preview gateway's list (.github/previews/gateway/gateway.py on master).
const ROUTES = [
  /^\/auth\/session(\/|$)/,
  /^\/api\/user\/v1\/csrf$/,
  /^\/v1\/me$/,
  /^\/v1\/library(\/|$)/,
];

// Hop-by-hop plus anything that could influence the User Service's origin reconstruction.
const DROP = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'upgrade',
  'forwarded',
  'accept-encoding',
]);
// undici transparently decompresses, so these no longer describe the relayed body.
const RESPONSE_DROP = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

export async function proxySessionRequest(req: Request): Promise<Response | null> {
  if (!TARGET) return null;
  const url = new URL(req.url);
  if (!ROUTES.some((route) => route.test(url.pathname))) return null;

  const headers = new Headers();
  req.headers.forEach((value, name) => {
    if (DROP.has(name) || name.startsWith('x-forwarded-')) return;
    headers.set(name, value);
  });
  headers.set(WEB_ORIGIN_HEADER, webOrigin());
  // Dev only: ask for plaintext so no decode/re-encode mismatch is possible.
  headers.set('accept-encoding', 'identity');

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  try {
    const upstream = await fetch(`${TARGET}${url.pathname}${url.search}`, {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
      // @ts-expect-error -- required by undici for streamed request bodies
      duplex: hasBody ? 'half' : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(USER_SERVICE_TIMEOUT_MS),
    });
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => {
      if (name !== 'set-cookie' && !RESPONSE_DROP.has(name)) responseHeaders.set(name, value);
    });
    // Keep every Set-Cookie separate (the callback sets the session and CSRF cookies).
    for (const cookie of upstream.headers.getSetCookie()) {
      responseHeaders.append('set-cookie', cookie);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    // Connection errors carry their reason in cause.code (ECONNREFUSED) with an empty message.
    const reason = err instanceof Error && err.cause instanceof Error ? err.cause : err;
    const cause =
      reason instanceof Error
        ? (reason as NodeJS.ErrnoException).code || reason.message || reason.name
        : String(reason);
    console.error(`[session-proxy] ${TARGET} unreachable: ${cause}`);
    return new Response(
      `Session service unavailable at ${TARGET}: ${cause}\n` +
        'Is RelistenUserService running and is the mkcert CA trusted (dev:session uses --use-system-ca)? See docs/browser-session.md.',
      {
        status: 502,
        headers: {
          'cache-control': 'private, no-store',
          'content-type': 'text/plain; charset=utf-8',
        },
      }
    );
  }
}
