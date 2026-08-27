import 'server-only';

const dev = process.env.NODE_ENV !== 'production';

/** The browser-visible origin the User Service should reconstruct callbacks against. */
export const WEB_ORIGIN =
  process.env.RELISTEN_WEB_ORIGIN ??
  (dev ? 'https://web.relisten.localhost:5173' : 'https://relisten.net');

/**
 * Where server-side session lookups go. Must present as the accounts host to the
 * User Service (its relay middleware only honours X-Relisten-Web-Origin from there).
 * In-cluster this is the user-service Service behind Traefik; locally it's the
 * `dotnet run` HTTPS endpoint.
 */
export const USER_SERVICE_URL =
  process.env.RELISTEN_USER_SERVICE_URL ??
  (dev ? 'https://accounts.relisten.localhost:5443' : 'https://accounts.relisten.net');

export const SESSION_COOKIE = '__Host-relisten_session';
export const CSRF_COOKIE = '__Host-relisten_csrf';
export const CSRF_HEADER = 'X-Relisten-CSRF';
export const WEB_ORIGIN_HEADER = 'X-Relisten-Web-Origin';

/** The OIDC issuer / SSO-cookie host. Logout bounces through it to clear the SSO cookie. */
export const AUTH_ORIGIN =
  process.env.RELISTEN_AUTH_ORIGIN ??
  (dev ? 'https://auth.relisten.localhost:5443' : 'https://auth.relisten.net');
