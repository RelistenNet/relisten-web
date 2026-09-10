import 'server-only';

// Short-lived correlation cookie for the PKCE + state round-trip between /auth/login and
// /auth/callback. Server-set and server-read only — the browser just carries it through the
// redirect to the auth provider and back, same as the architecture doc's own correlation-cookie
// design for the target facade.

import { defineCookie, jsonCookieCodec } from '@timber-js/app/cookies';
import { serializeCookie, serializeDeleteCookie } from './rawCookieHeader';

export interface PendingLogin {
  verifier: string;
  state: string;
  returnTo: string;
}

const COOKIE_NAME = 'relisten_pending_login';
// Matches the architecture doc's stated ten-minute transaction expiry for the equivalent
// backend correlation cookie.
const MAX_AGE_SECONDS = 10 * 60;

const pendingLoginCookie = defineCookie<PendingLogin | null>(COOKIE_NAME, {
  codec: jsonCookieCodec<PendingLogin | null>(null),
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV !== 'development',
  maxAge: MAX_AGE_SECONDS,
});

// Reads work in any context (route handlers, server components, server actions, middleware).
export function getPendingLogin(): PendingLogin | null {
  return pendingLoginCookie.get();
}

// Writes: /auth/login and /auth/callback are both GET route.ts handlers, which can't use
// getCookieJar().set()/.delete() today — see rawCookieHeader.ts. Callers append the returned
// string directly to their RouteContext.headers as a 'Set-Cookie' header.
export function serializePendingLoginCookie(pending: PendingLogin): string {
  return serializeCookie(COOKIE_NAME, JSON.stringify(pending), MAX_AGE_SECONDS);
}

export function serializeClearPendingLoginCookie(): string {
  return serializeDeleteCookie(COOKIE_NAME);
}
