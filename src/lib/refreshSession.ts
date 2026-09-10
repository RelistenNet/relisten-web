import 'server-only';

// Proactive access-token refresh, called from middleware.ts on every request that might render
// AccountMenu (see the (browse)/(content)/(bare) middleware.ts files).
//
// This can't be done reactively on a 401 from a server component read (NavBar -> getSession()):
// refreshing writes the rotated refresh token back to the cookie, and cookie writes are only
// allowed from middleware.ts, server actions, and route handlers — not from a server component's
// read-only render. Refreshing here, before render, means getSession() always sees an
// already-fresh token and never needs to write anything itself.

import ky from 'ky';
import { ACCOUNTS_AUTH_URL, ACCOUNTS_CLIENT_ID } from './constants';
import { getTokens, setTokens, clearTokens } from './authToken';

// Refresh a bit before actual expiry so the subsequent API call in this same request never
// races an already-expired access token.
const REFRESH_SKEW_MS = 30_000;

export async function refreshSessionIfNeeded(): Promise<void> {
  const tokens = getTokens();
  if (!tokens) return;
  if (Date.now() < tokens.expiresAt - REFRESH_SKEW_MS) return;

  try {
    const response = await ky
      .post(`${ACCOUNTS_AUTH_URL}/connect/token`, {
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: ACCOUNTS_CLIENT_ID,
        }),
      })
      .json<{ access_token: string; refresh_token: string; expires_in: number }>();

    setTokens({
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + response.expires_in * 1000,
    });
  } catch {
    // Refresh failed (revoked, expired, or reused token) — clear the cookie so getSession()
    // shows signed-out instead of every subsequent request retrying a dead refresh token.
    clearTokens();
  }
}
