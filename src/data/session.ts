import 'server-only';

import { cache } from 'react';
import type { AccountProfile, SessionNavigation } from '@/domain/account';
import {
  CSRF_HEADER,
  USER_SERVICE_TIMEOUT_MS,
  USER_SERVICE_URL,
  WEB_ORIGIN_HEADER,
  webOrigin,
} from '@/lib/session/config';
import { sessionReturnSearchParams } from '@/lib/searchParams/sessionSearchParams';
import { csrfCookie, sessionCookie } from '@/lib/session/sessionCookie';
import { setCookieValue } from '@/lib/session/setCookieValue';

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

/**
 * Forward the browser's session cookies to the User Service. Never cached; times out.
 * `csrf` replaces the browser's CSRF cookie: the one csrfToken() was just issued.
 */
async function userServiceFetch(
  path: string,
  init: RequestInit = {},
  csrf: string | null = csrfCookie.get()
): Promise<Response> {
  const cookie = [
    [sessionCookie.name, sessionCookie.get()],
    [csrfCookie.name, csrf],
  ]
    .filter(([, value]) => value !== null)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  const origin = webOrigin();
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set(WEB_ORIGIN_HEADER, origin);
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
  const token = sessionCookie.get();
  return token ? userForSession(token) : null;
}

/**
 * A CSRF request token and the cookie it is bound to. The antiforgery cookie lasts
 * a browser session while the web session cookie persists, so after a browser
 * restart the User Service mints a fresh cookie here. It goes straight into the
 * POST that follows, never to the browser: that POST ends the session and clears it.
 */
async function csrfToken(): Promise<{ requestToken: string; cookie: string | null }> {
  const path = '/api/user/v1/csrf';
  const res = await userServiceFetch(path);
  if (!res.ok) throw new UserServiceError(res.status, path);
  const { request_token } = (await res.json()) as { request_token: string };
  return {
    requestToken: request_token,
    cookie: setCookieValue(res.headers, csrfCookie.name) ?? csrfCookie.get(),
  };
}

/**
 * POST a session-ending call (sign-out, switch account) with a CSRF token. The User
 * Service clears the session and CSRF cookies on success; we clear them ourselves
 * rather than relay its Set-Cookie headers, so no cookie from that response, or
 * from anything between us and it, reaches the browser. Actions only.
 */
async function endSession<T>(path: string): Promise<T> {
  const csrf = await csrfToken();
  const res = await userServiceFetch(
    path,
    { method: 'POST', headers: { [CSRF_HEADER]: csrf.requestToken } },
    csrf.cookie
  );
  if (!res.ok) throw new UserServiceError(res.status, path);
  const body = (await res.json()) as T;
  sessionCookie.delete();
  csrfCookie.delete();
  return body;
}

export const logoutSession = () => endSession<SessionNavigation>('/auth/session/logout');

export const switchAccountSession = (returnTo: string) =>
  endSession<SessionNavigation>(
    sessionReturnSearchParams.href('/auth/session/switch-account', { return_to: returnTo })
  );
