import 'server-only';

import { cache } from 'react';
import { getCookieJar } from '@timber-js/app/server';
import type { AccountProfile, SessionNavigation } from '@/domain/account';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  USER_SERVICE_TIMEOUT_MS,
  USER_SERVICE_URL,
  WEB_ORIGIN_HEADER,
  localSession,
  webOrigin,
} from '@/lib/session/config';
import { sessionReturnSearchParams } from '@/lib/searchParams/sessionSearchParams';

/**
 * The signed-in user's account, from the Relisten User Service. Per-user data, so
 * nothing here goes through `defineResource`/timber's cache: React `cache` dedupes
 * within one request only.
 */

export class UserServiceError extends Error {
  constructor(
    readonly status: number,
    readonly path: string
  ) {
    super(`User Service ${path} responded ${status}`);
  }
}

/** Thrown when the User Service is down/erroring for a request that carries a session cookie. */
export class SessionUnavailableError extends Error {
  constructor(cause: unknown) {
    super('The account service is temporarily unavailable.', { cause });
    this.name = 'SessionUnavailableError';
  }
}

/** Forward the browser's session cookies to the User Service. Never cached; times out. */
async function userServiceFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const jar = getCookieJar();
  const cookie = [SESSION_COOKIE, CSRF_COOKIE]
    .map((name) => {
      const value = jar.get(name);
      return value === undefined ? null : `${name}=${value}`;
    })
    .filter(Boolean)
    .join('; ');

  const origin = webOrigin();
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  // Only the local accounts host needs telling which web origin this is. The
  // preview gateway sets it itself, and relisten.net uses its own host.
  if (localSession) headers.set(WEB_ORIGIN_HEADER, origin);
  if (cookie) headers.set('cookie', cookie);
  // Cookie-authenticated unsafe requests must carry the exact web origin.
  if (init.method && init.method !== 'GET') headers.set('origin', origin);

  return fetch(`${USER_SERVICE_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(USER_SERVICE_TIMEOUT_MS),
  });
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await userServiceFetch(path, init);
  if (!res.ok) throw new UserServiceError(res.status, path);
  return (await res.json()) as T;
}

// Keyed on the token so a cookie the request itself replaces gets a fresh lookup.
const userForSession = cache(async (_token: string): Promise<AccountProfile | null> => {
  try {
    return await json<AccountProfile>('/v1/me');
  } catch (err) {
    if (err instanceof UserServiceError && err.status === 401) return null;
    console.error('[session] /v1/me failed', err);
    throw new SessionUnavailableError(err);
  }
});

/**
 * The signed-in user for this request, or null when there is no (valid) session.
 * Throws SessionUnavailableError on outages rather than pretending the user is
 * signed out, so the error boundary renders that state.
 */
export async function getCurrentUser(): Promise<AccountProfile | null> {
  const token = getCookieJar().get(SESSION_COOKIE);
  return token ? userForSession(token) : null;
}

/** Mutable contexts only (actions / route handlers): relays the CSRF cookie. */
async function csrfToken(): Promise<string> {
  const path = '/api/user/v1/csrf';
  const res = await userServiceFetch(path);
  // The antiforgery cookie is a browser-session cookie while the web session
  // cookie is persistent, so after a browser restart the User Service mints a
  // fresh __Host-relisten_csrf here. Relay it before the POST: the jar's
  // read-your-own-writes makes the next userServiceFetch send the cookie the
  // request token is bound to, and the browser receives it too.
  getCookieJar().setFromHeaders(res.headers);
  if (!res.ok) throw new UserServiceError(res.status, path);
  const { request_token } = (await res.json()) as { request_token: string };
  return request_token;
}

/** POST with a session-bound CSRF token, relaying any Set-Cookie back to the browser. Actions only. */
async function mutate<T>(path: string): Promise<T> {
  const token = await csrfToken();
  const res = await userServiceFetch(path, { method: 'POST', headers: { [CSRF_HEADER]: token } });
  getCookieJar().setFromHeaders(res.headers);
  if (!res.ok) throw new UserServiceError(res.status, path);
  return (await res.json()) as T;
}

export const logoutSession = () => mutate<SessionNavigation>('/auth/session/logout');

export const switchAccountSession = (returnTo: string) =>
  mutate<SessionNavigation>(
    sessionReturnSearchParams.href('/auth/session/switch-account', { return_to: returnTo })
  );
