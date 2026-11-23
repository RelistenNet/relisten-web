import 'server-only';

import { cache } from 'react';
import type { AccountProfile, SessionNavigation, SessionNavigationResult } from '@/domain/account';
import {
  CSRF_HEADER,
  USER_SERVICE_TIMEOUT_MS,
  USER_SERVICE_URL,
  WEB_ORIGIN_HEADER,
  localSession,
  userServiceRoutingHeaders,
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
export async function userServiceFetch(
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
  for (const [name, value] of Object.entries(userServiceRoutingHeaders())) headers.set(name, value);
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
  const token = sessionCookie.get();
  return token ? userForSession(token) : null;
}

/** The outcome of a failed call. On `expired` the dead session cookies are dropped. */
function failed(status: number, path: string): SessionNavigationResult {
  if (status === 401) {
    sessionCookie.delete();
    csrfCookie.delete();
    return { kind: 'expired' };
  }
  console.error(`[session] ${path} responded ${status}`);
  return { kind: status === 403 ? 'rejected' : 'unavailable' };
}

/**
 * POST a session-ending call (sign-out, switch account) with a CSRF token. Actions
 * only. Never throws: every outcome is a result.
 *
 * The antiforgery cookie lasts a browser session while the web session cookie
 * persists, so after a browser restart the User Service mints a fresh one with the
 * token. It goes straight into the POST, never to the browser. The User Service
 * clears the session and CSRF cookies on success; we clear them ourselves rather
 * than relay its Set-Cookie headers, so no cookie from that response, or from
 * anything between us and it, reaches the browser.
 */
async function endSession(path: string): Promise<SessionNavigationResult> {
  const csrfPath = '/api/user/v1/csrf';
  try {
    const csrf = await userServiceFetch(csrfPath);
    if (!csrf.ok) return failed(csrf.status, csrfPath);
    const { request_token } = (await csrf.json()) as { request_token: string };
    const csrfValue = setCookieValue(csrf.headers, csrfCookie.name) ?? csrfCookie.get();

    const res = await userServiceFetch(
      path,
      { method: 'POST', headers: { [CSRF_HEADER]: request_token } },
      csrfValue
    );
    if (!res.ok) return failed(res.status, path);
    const { navigation_url } = (await res.json()) as SessionNavigation;
    sessionCookie.delete();
    csrfCookie.delete();
    return { kind: 'navigate', url: navigation_url };
  } catch (err) {
    console.error(`[session] ${path} failed`, err);
    return { kind: 'unavailable' };
  }
}

export const logoutSession = () => endSession('/auth/session/logout');

export const switchAccountSession = (returnTo: string) =>
  endSession(
    sessionReturnSearchParams.href('/auth/session/switch-account', { return_to: returnTo })
  );
