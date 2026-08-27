import 'server-only';

const dev = process.env.NODE_ENV !== 'production';
// `pnpm dev:session` sets this to "local" (dotnet run) or "production" (relisten.net).
const localBackend = dev && process.env.RELISTEN_WEB_SESSION !== 'production';

/** The browser-visible origin the User Service should reconstruct callbacks against. */
export const WEB_ORIGIN =
  process.env.RELISTEN_WEB_ORIGIN ??
  (dev ? 'https://web.relisten.localhost:5173' : 'https://relisten.net');

/**
 * Where server-side session lookups go. The User Service only honours the
 * X-Relisten-Web-Origin relay from its accounts host or a configured web origin,
 * so this is either the local `dotnet run` endpoint, relisten.net itself (Traefik
 * routes the session paths), or the in-cluster service.
 */
export const USER_SERVICE_URL =
  process.env.RELISTEN_USER_SERVICE_URL ??
  (localBackend ? 'https://accounts.relisten.localhost:5443' : 'https://relisten.net');

/** The OIDC issuer / SSO-cookie host. Logout bounces through it to clear the SSO cookie. */
export const AUTH_ORIGIN =
  process.env.RELISTEN_AUTH_ORIGIN ??
  (localBackend ? 'https://auth.relisten.localhost:5443' : 'https://auth.relisten.net');

export const SESSION_COOKIE = '__Host-relisten_session';
export const CSRF_COOKIE = '__Host-relisten_csrf';
export const CSRF_HEADER = 'X-Relisten-CSRF';
export const WEB_ORIGIN_HEADER = 'X-Relisten-Web-Origin';
