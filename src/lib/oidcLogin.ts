import 'server-only';

// Login start + callback exchange for the interim PKCE + Bearer auth flow — see auth-plan.md
// "Interim approach". Runs entirely server-side (see app/auth/login/route.ts and
// app/auth/callback/route.ts). PKCE verifier and the resulting tokens never reach the browser.
//
// This module only computes values — it doesn't write cookies itself. The two route.ts callers
// own all cookie I/O (via rawCookieHeader.ts, appended to their RouteContext.headers) because a
// GET route.ts handler can't use getCookieJar().set() today — see rawCookieHeader.ts for why.

import ky from 'ky';
import { ACCOUNTS_AUTH_URL, ACCOUNTS_CLIENT_ID, ACCOUNTS_REDIRECT_URI } from './constants';
import { generateCodeVerifier, generateCodeChallenge, generateState } from './pkce';
import type { StoredTokens } from './authToken';
import { serializePendingLoginCookie, type PendingLogin } from './pendingLogin';

export class LoginCallbackError extends Error {}

// Defense in depth: the backend re-validates return_to too, but never redirect a browser
// somewhere off-site based on a value we round-tripped through storage.
export function isRelativePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

export type LoginProvider = 'apple' | 'google';

export interface AuthorizeRequest {
  authorizeUrl: string;
  pendingLoginCookie: string;
}

// The backend's /connect/authorize expects the provider up front (AuthorizationController
// reads a `provider` request parameter directly) rather than rendering a chooser itself —
// so relisten-web needs its own "Continue with Apple/Google" entry points, same as mobile.
export async function buildAuthorizeRequest(
  returnTo: string,
  provider: LoginProvider
): Promise<AuthorizeRequest> {
  const safeReturnTo = isRelativePath(returnTo) ? returnTo : '/';

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();

  const pending: PendingLogin = { verifier, state, returnTo: safeReturnTo };

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ACCOUNTS_CLIENT_ID,
    redirect_uri: ACCOUNTS_REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: 'openid profile offline_access user.read',
    provider,
  });

  return {
    authorizeUrl: `${ACCOUNTS_AUTH_URL}/connect/authorize?${params}`,
    pendingLoginCookie: serializePendingLoginCookie(pending),
  };
}

export async function exchangeCode(
  pending: PendingLogin | null,
  code: string,
  state: string
): Promise<{ returnTo: string; tokens: StoredTokens }> {
  if (!pending) throw new LoginCallbackError('No pending login found for this browser session.');
  if (pending.state !== state) throw new LoginCallbackError('Login state did not match.');

  let json: { access_token: string; refresh_token: string; expires_in: number };
  try {
    json = await ky
      .post(`${ACCOUNTS_AUTH_URL}/connect/token`, {
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: ACCOUNTS_REDIRECT_URI,
          client_id: ACCOUNTS_CLIENT_ID,
          code_verifier: pending.verifier,
        }),
      })
      .json();
  } catch {
    throw new LoginCallbackError('Sign-in failed while exchanging the login code.');
  }

  const tokens: StoredTokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };

  return { returnTo: pending.returnTo, tokens };
}
