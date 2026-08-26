import 'server-only';

// Server-side wrapper for the native accounts.relisten.net bearer API, used by the interim
// PKCE + Bearer auth flow (see auth-plan.md "Interim approach"). Runs only in server components,
// server actions, and route handlers — the token never reaches the browser, so calls to this
// API happen server-to-server (no CORS involved, unlike the earlier browser-side version of
// this client).
//
// No reactive refresh-on-401 here: refreshing would need to write the rotated token back to the
// cookie, which isn't allowed from a server component's read-only render (the most common
// caller, via getSession()). Access-token refresh instead happens proactively in middleware.ts
// before render — see refreshSession.ts. A 401 here means the proactive refresh didn't run or
// already failed, so it's treated as signed-out rather than retried.

import ky from 'ky';
import { ACCOUNTS_API_URL } from './constants';
import { getTokens } from './authToken';

export class NotSignedInError extends Error {
  constructor() {
    super('Not signed in');
  }
}

async function authorizedRequest<T>(
  path: string,
  init: Parameters<typeof ky>[1] = {}
): Promise<T> {
  const tokens = getTokens();
  if (!tokens) throw new NotSignedInError();

  return ky(path, {
    prefix: ACCOUNTS_API_URL,
    cache: 'no-store',
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${tokens.accessToken}` },
  }).json<T>();
}

export const accountsClient = {
  get: <T>(path: string): Promise<T> => authorizedRequest<T>(path),
  patch: <T>(path: string, json: unknown): Promise<T> =>
    authorizedRequest<T>(path, { method: 'PATCH', json }),
  post: <T>(path: string, json?: unknown): Promise<T> =>
    authorizedRequest<T>(path, { method: 'POST', json }),
};
