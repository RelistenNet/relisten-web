import 'server-only';

import { redirect, type RouteContext } from '@timber-js/app/server';
import { exchangeCode, isRelativePath, LoginCallbackError } from '@/lib/oidcLogin';
import { getPendingLogin, serializeClearPendingLoginCookie } from '@/lib/pendingLogin';
import { serializeTokenCookie } from '@/lib/authToken';

// The auth provider redirects the browser back here with ?code=&state=. Runs the code exchange
// server-side and sets the token cookie, then redirects on to return_to — the browser never
// sees the code exchange or the tokens.
export async function GET(ctx: RouteContext) {
  const url = new URL(ctx.req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // Read-once: clear the correlation cookie regardless of outcome so a replayed callback
  // request can't reuse it.
  const pending = getPendingLogin();
  ctx.headers.append('Set-Cookie', serializeClearPendingLoginCookie());

  if (!code || !state) {
    return errorResponse('Missing login response from the sign-in provider.');
  }

  let returnTo: string;
  let tokens: Awaited<ReturnType<typeof exchangeCode>>['tokens'];
  try {
    ({ returnTo, tokens } = await exchangeCode(pending, code, state));
  } catch (err) {
    return errorResponse(err instanceof LoginCallbackError ? err.message : 'Sign-in failed.');
  }

  ctx.headers.append('Set-Cookie', serializeTokenCookie(tokens));
  redirect(isRelativePath(returnTo) ? returnTo : '/');
}

function errorResponse(message: string): Response {
  const html = `<!doctype html><html><body class="content"><p>${escapeHtml(message)}</p><a href="/">Return home</a></body></html>`;
  return new Response(html, { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function escapeHtml(input: string): string {
  const escapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return input.replace(/[&<>"']/g, (c) => escapes[c]);
}
