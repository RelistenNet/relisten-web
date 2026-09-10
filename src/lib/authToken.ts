import 'server-only';

// Token storage for the interim mobile-style PKCE + Bearer auth flow — see auth-plan.md.
//
// Tokens live in a real HttpOnly cookie, set and read entirely server-side (route handlers,
// server actions, server components, middleware). Browser JS never touches this cookie or the
// tokens inside it — this is the arch doc's core web security rule ("browser JavaScript never
// receives Relisten tokens"), satisfied today without waiting on the backend's target
// session-cookie facade, since relisten-web's own server holds the token instead. Any
// authenticated API call must go through a server action or route handler (see
// accountsClient.ts) rather than a client `fetch`.

import { defineCookie, jsonCookieCodec } from '@timber-js/app/cookies';
import { serializeCookie, serializeDeleteCookie } from './rawCookieHeader';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

const COOKIE_NAME = 'relisten_auth_tokens';
// Matches the native refresh-token family lifetime from the architecture doc. The stored blob
// includes the refresh token, which long outlives the access token's own `expiresAt` — using
// that shorter value for Max-Age would delete the refresh token minutes after login.
const COOKIE_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

const tokenCookie = defineCookie<StoredTokens | null>(COOKIE_NAME, {
  codec: jsonCookieCodec<StoredTokens | null>(null),
  httpOnly: true, // default, but explicit: this cookie must never be readable by browser JS
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV !== 'development',
  maxAge: COOKIE_MAX_AGE_SECONDS,
});

// Reads work in any context.
export function getTokens(): StoredTokens | null {
  return tokenCookie.get();
}

// Works from middleware.ts and server actions (both confirmed-mutable contexts) — e.g.
// refreshSession.ts and authActions.ts's signOutAction.
export function setTokens(tokens: StoredTokens): void {
  tokenCookie.set(tokens);
}

export function clearTokens(): void {
  tokenCookie.delete();
}

// /auth/callback is a GET route.ts handler, which can't use getCookieJar().set() today — see
// rawCookieHeader.ts. The route appends the returned string directly to RouteContext.headers.
export function serializeTokenCookie(tokens: StoredTokens): string {
  return serializeCookie(COOKIE_NAME, JSON.stringify(tokens), COOKIE_MAX_AGE_SECONDS);
}

export function serializeClearTokenCookie(): string {
  return serializeDeleteCookie(COOKIE_NAME);
}
