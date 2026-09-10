import 'server-only';

// Server-side session read. Computed once per request (wrapped in React.cache) by NavBar and
// passed down as a prop through MainNavHeader -> AccountMenu — no client-side fetch, so there's
// no signed-out-then-signed-in loading flash on first paint.

import { cache } from 'react';
import { HTTPError } from 'ky';
import { accountsClient, NotSignedInError } from './accountsClient';

interface MeResponse {
  username: string;
  username_version: number;
  username_review_needed: boolean;
  username_reviewed_at: string | null;
  username_change_available_at: string | null;
}

export type AccountSession =
  | { signedIn: false }
  | {
      signedIn: true;
      username: string;
      usernameVersion: number;
      usernameReviewNeeded: boolean;
      usernameReviewedAt: string | null;
      usernameChangeAvailableAt: string | null;
    };

export const getSession = cache(async (): Promise<AccountSession> => {
  try {
    const me = await accountsClient.get<MeResponse>('v1/me');
    return {
      signedIn: true,
      username: me.username,
      usernameVersion: me.username_version,
      usernameReviewNeeded: me.username_review_needed,
      usernameReviewedAt: me.username_reviewed_at,
      usernameChangeAvailableAt: me.username_change_available_at,
    };
  } catch (err) {
    // Not signed in is an expected result, not an error — no token cookie, or the server
    // rejected it and accountsClient already cleared it. Any other failure (accounts backend
    // unreachable, unexpected 5xx, etc.) also falls back to signed-out rather than throwing —
    // getSession() runs inside NavBar, which every page renders, so a broken/unreachable
    // accounts backend must never take down the whole site.
    if (err instanceof NotSignedInError) return { signedIn: false };
    if (err instanceof HTTPError && err.response.status === 401) return { signedIn: false };
    console.error('[session] getSession() failed, falling back to signed-out', err);
    return { signedIn: false };
  }
});
