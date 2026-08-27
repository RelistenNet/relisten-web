'use server';

import { createActionClient, redirectExternal } from '@timber-js/app/server';
import { AUTH_ORIGIN } from './config';
import { logoutSession, switchAccountSession } from './server';

const sessionAction = createActionClient({});

// The User Service answers with a navigation_url on the auth host that clears the
// SSO cookie and then returns to the web origin. Nothing else may be a target.
const navigate = (url: string) => redirectExternal(url, [AUTH_ORIGIN]);

export const signOut = sessionAction.action(async () => {
  const { navigation_url } = await logoutSession();
  navigate(navigation_url);
});

export const switchAccount = sessionAction.action(async () => {
  const { navigation_url } = await switchAccountSession('/account');
  navigate(navigation_url);
});
