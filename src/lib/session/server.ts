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

/**
 * The signed-in user for this request, or null. Deduplicated per render via
 * React.cache so layouts, access.ts, and pages can all call it freely.
 */
export const getCurrentUser = cache(async (): Promise<AccountProfile | null> => {
  if (!getCookieJar().has(SESSION_COOKIE)) return null;
  try {
    return await json<AccountProfile>('/v1/me');
  } catch (err) {
    if (err instanceof UserServiceError && err.status === 401) return null;
    console.error('[session] /v1/me failed', err);
    return null;
  }
});

export const getLibrarySnapshot = cache(() => json<LibrarySnapshot>('/v1/library/snapshot'));

async function csrfToken(): Promise<string> {
  const { request_token } = await json<{ request_token: string }>('/api/user/v1/csrf');
  return request_token;
}

/** POST with a session-bound CSRF token, relaying any Set-Cookie back to the browser. */
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
