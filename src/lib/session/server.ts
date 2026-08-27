import 'server-only';

import { cache } from 'react';
import { getCookieJar } from '@timber-js/app/server';
import {
  CSRF_COOKIE,
  CSRF_HEADER,
  SESSION_COOKIE,
  USER_SERVICE_URL,
  WEB_ORIGIN,
  WEB_ORIGIN_HEADER,
} from './config';
import type {
  AccountProfile,
  FavoriteMutation,
  FavoriteMutationBatchResponse,
  LibrarySnapshot,
  SessionNavigation,
} from './types';

export class UserServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string
  ) {
    super(`User Service ${path} responded ${status}`);
  }
}

/** Forward the browser's session cookies to the User Service. Never cached. */
export async function userServiceFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const jar = getCookieJar();
  const cookie = [SESSION_COOKIE, CSRF_COOKIE]
    .map((name) => {
      const value = jar.get(name);
      return value === undefined ? null : `${name}=${value}`;
    })
    .filter(Boolean)
    .join('; ');

  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  headers.set(WEB_ORIGIN_HEADER, WEB_ORIGIN);
  if (cookie) headers.set('cookie', cookie);
  // Cookie-authenticated unsafe requests must carry the exact web origin.
  if (init.method && init.method !== 'GET') headers.set('origin', WEB_ORIGIN);

  return fetch(`${USER_SERVICE_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await userServiceFetch(path, init);
  if (!res.ok) throw new UserServiceError(res.status, path);
  return (await res.json()) as T;
}

/** Thrown when the User Service is down/erroring for a request that carries a session cookie. */
export class SessionUnavailableError extends Error {
  constructor(cause: unknown) {
    super('The account service is temporarily unavailable.', { cause });
    this.name = 'SessionUnavailableError';
  }
}

/**
 * The signed-in user for this request, or null when there is no (valid) session.
 * Deduplicated per render via React.cache so layouts, access.ts, and pages can
 * all call it freely. Throws SessionUnavailableError on outages rather than
 * pretending the user is signed out — let error.tsx render that state.
 */
export const getCurrentUser = cache(async (): Promise<AccountProfile | null> => {
  if (!getCookieJar().has(SESSION_COOKIE)) return null;
  try {
    return await json<AccountProfile>('/v1/me');
  } catch (err) {
    if (err instanceof UserServiceError && err.status === 401) return null;
    console.error('[session] /v1/me failed', err);
    throw new SessionUnavailableError(err);
  }
});

/** The favorites library, or null if it could not be loaded (logged). */
export const getLibrarySnapshot = cache(async (): Promise<LibrarySnapshot | null> => {
  try {
    return await json<LibrarySnapshot>('/v1/library/snapshot');
  } catch (err) {
    console.error('[session] /v1/library/snapshot failed', err);
    return null;
  }
});

/** Mutable contexts only (actions / route handlers): relays the CSRF cookie. */
async function csrfToken(): Promise<string> {
  const path = '/api/user/v1/csrf';
  const res = await userServiceFetch(path);
  // The antiforgery cookie is a browser-session cookie while the web session
  // cookie is persistent, so after a browser restart GetAndStoreTokens mints a
  // fresh __Host-relisten_csrf here. Relay it before the POST: the jar's
  // read-your-own-writes makes the next userServiceFetch send the cookie the
  // request token is bound to, and the browser receives it too.
  getCookieJar().setFromHeaders(res.headers);
  if (!res.ok) throw new UserServiceError(res.status, path);
  const { request_token } = (await res.json()) as { request_token: string };
  return request_token;
}

/** POST with a session-bound CSRF token, relaying any Set-Cookie back to the browser. Actions only. */
async function mutate<T>(path: string, body?: unknown): Promise<T> {
  const token = await csrfToken();
  const headers: Record<string, string> = { [CSRF_HEADER]: token };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await userServiceFetch(path, {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  getCookieJar().setFromHeaders(res.headers);
  if (!res.ok) throw new UserServiceError(res.status, path);
  return (await res.json()) as T;
}

export const logoutSession = () => mutate<SessionNavigation>('/auth/session/logout');

export const switchAccountSession = (returnTo = '/') =>
  mutate<SessionNavigation>(
    `/auth/session/switch-account?${new URLSearchParams({ return_to: returnTo })}`
  );

export const mutateFavorites = (mutations: FavoriteMutation[]) =>
  mutate<FavoriteMutationBatchResponse>('/v1/library/favorite-mutations:batch', {
    contract_version: 1,
    mutations,
  });

/** Same-origin entry point for sign-in; safe to use as a plain <a href>. */
export function signInHref(returnTo = '/'): string {
  return `/auth/session/start?${new URLSearchParams({ return_to: returnTo })}`;
}
