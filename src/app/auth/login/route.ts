import 'server-only';

import { redirectExternal, type RouteContext } from '@timber-js/app/server';
import { ACCOUNTS_AUTH_URL } from '@/lib/constants';
import { buildAuthorizeRequest, type LoginProvider } from '@/lib/oidcLogin';

// Plain top-level navigation (no client JS required) — AccountMenu links straight here.
// Builds the PKCE transaction, stores it in a short-lived correlation cookie, and redirects
// to the auth provider's authorize endpoint.
export async function GET(ctx: RouteContext) {
  const url = new URL(ctx.req.url);
  const provider = url.searchParams.get('provider');
  const returnTo = url.searchParams.get('return_to') ?? '/';

  if (provider !== 'apple' && provider !== 'google') {
    return new Response('Invalid provider', { status: 400 });
  }

  const { authorizeUrl, pendingLoginCookie } = await buildAuthorizeRequest(
    returnTo,
    provider as LoginProvider
  );
  ctx.headers.append('Set-Cookie', pendingLoginCookie);
  redirectExternal(authorizeUrl, [ACCOUNTS_AUTH_URL]);
}
