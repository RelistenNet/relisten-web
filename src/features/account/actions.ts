'use server';

import {
  ActionError,
  createActionClient,
  getCookieJar,
  redirect,
  redirectExternal,
} from '@timber-js/app/server';
import { href } from '@timber-js/app/routes';
import { logoutSession, switchAccountSession, UserServiceError } from '@/data/session';
import { AUTH_ORIGIN, CSRF_COOKIE, SESSION_COOKIE } from '@/lib/session/config';

const sessionAction = createActionClient({});

/**
 * Run a session mutation and follow its navigation_url, which is on the auth host:
 * it clears the SSO cookie and then returns to the web origin. Nothing else may be
 * a target. A 401 means the session is already gone (revoked elsewhere, expired):
 * drop the dead cookies and land on /account signed out. A 403 is a CSRF/origin
 * failure on a live session and anything else is an outage; surface both and keep
 * the cookies.
 */
async function runSessionNavigation(mutation: () => Promise<{ navigation_url: string }>) {
  let navigationUrl: string;
  try {
    navigationUrl = (await mutation()).navigation_url;
  } catch (err) {
    if (err instanceof UserServiceError && err.status === 401) {
      const jar = getCookieJar();
      jar.delete(SESSION_COOKIE);
      jar.delete(CSRF_COOKIE);
      redirect(href('/account'));
    }
    const status = err instanceof UserServiceError ? err.status : undefined;
    console.error('[session] mutation failed', err);
    throw new ActionError(status === 403 ? 'SESSION_REJECTED' : 'SESSION_UNAVAILABLE');
  }
  redirectExternal(navigationUrl, [AUTH_ORIGIN]);
}

export const signOut = sessionAction.action(() => runSessionNavigation(logoutSession));

export const switchAccount = sessionAction.action(() =>
  runSessionNavigation(() => switchAccountSession(href('/account')))
);
