'use server';

import { redirect, redirectExternal } from '@timber-js/app/server';
import { href } from '@timber-js/app/routes';
import type { SessionNavigationResult } from '@/domain/account';
import { logoutSession, switchAccountSession } from '@/data/session';
import { AUTH_ORIGIN } from '@/lib/session/config';

export type SessionFormState = { error: 'rejected' | 'unavailable' } | null;

/**
 * `navigate` follows the User Service's navigation_url, which must be on the auth
 * host: it clears the SSO cookie and returns to the web origin. An expired session
 * lands on /account signed out. Anything else is shown in the form.
 */
function follow(result: SessionNavigationResult): SessionFormState {
  switch (result.kind) {
    case 'navigate':
      return redirectExternal(result.url, [AUTH_ORIGIN]);
    case 'expired':
      return redirect(href('/account'));
    default:
      return { error: result.kind };
  }
}

export async function signOut(_prev: SessionFormState): Promise<SessionFormState> {
  return follow(await logoutSession());
}

export async function switchAccount(_prev: SessionFormState): Promise<SessionFormState> {
  return follow(await switchAccountSession(href('/account')));
}
