import 'server-only';

import { USER_SERVICE_URL, WEB_ORIGIN, WEB_ORIGIN_HEADER } from './config';

/**
 * Same-origin forwarding of the browser-session routes to the User Service.
 *
 * In production Traefik routes these paths before they reach timber. In local
 * development (`pnpm dev:session`) this runs from app/proxy.ts instead — it has to
 * live here rather than in Vite's `server.proxy`, because timber's dev middleware
 * handles requests before Vite's proxy middleware gets a chance.
 */

// Only forward when explicitly in a session dev mode; in production Traefik owns these paths.
const TARGET = process.env.RELISTEN_WEB_SESSION ? USER_SERVICE_URL : null;

const ROUTES = [
  /^\/auth\/session(\/|$)/,
  /^\/api\/user\/v1\/csrf$/,
  /^\/v1\/me$/,
  /^\/v1\/library(\/|$)/,
];

// Hop-by-hop plus anything that could influence the User Service's origin reconstruction.
const DROP = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'forwarded']);

export function isSessionRoute(pathname: string): boolean {
  return ROUTES.some((route) => route.test(pathname));
}

export async function proxySessionRequest(req: Request): Promise<Response | null> {
  if (!TARGET) return null;
  const url = new URL(req.url);
  if (!isSessionRoute(url.pathname)) return null;

  const headers = new Headers();
  req.headers.forEach((value, name) => {
    if (DROP.has(name) || name.startsWith('x-forwarded-')) return;
    headers.set(name, value);
  });
  headers.set(WEB_ORIGIN_HEADER, WEB_ORIGIN);

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
    });
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  } catch (err) {
    console.error('[session-proxy] User Service unreachable', err);
    return new Response('Session service unavailable.', {
      status: 502,
      headers: { 'cache-control': 'private, no-store' },
    });
  }
}
