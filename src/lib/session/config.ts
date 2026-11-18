import 'server-only';
import { getDeploymentEnvironment } from '@/lib/deployment/server';

const dev = process.env.NODE_ENV !== 'production';
// `pnpm dev:session` sets this to "local" (dotnet run) or "production" (relisten.net).
const localBackend = dev && process.env.RELISTEN_WEB_SESSION !== 'production';

const LOCAL_WEB_ORIGIN = 'https://web.relisten.localhost:5173';

/**
 * The browser-visible origin the User Service should reconstruct callbacks against.
 * Read per request (like the deployment environment) so one image can serve
 * production or any preview. Never derived from the Host header.
 */
export function webOrigin(): string {
  if (process.env.RELISTEN_WEB_ORIGIN) return process.env.RELISTEN_WEB_ORIGIN;
  if (dev) return LOCAL_WEB_ORIGIN;
  const deployment = getDeploymentEnvironment();
  return deployment.isPreview ? deployment.url : 'https://relisten.net';
}

/**
 * Where server-side session lookups go. The User Service only honours the
 * X-Relisten-Web-Origin relay from its accounts host or a configured web origin,
 * so this is either the local `dotnet run` accounts host or relisten.net itself
 * (Traefik routes the session paths there).
 */
export const USER_SERVICE_URL =
  process.env.RELISTEN_USER_SERVICE_URL ??
  (localBackend ? 'https://accounts.relisten.localhost:5443' : 'https://relisten.net');

/** The OIDC issuer / SSO-cookie host. Logout bounces through it to clear the SSO cookie. */
export const AUTH_ORIGIN =
  process.env.RELISTEN_AUTH_ORIGIN ??
  (localBackend ? 'https://localhost:5443' : 'https://auth.relisten.net');

/** Every User Service call is aborted after this; the page renders its failure state instead. */
export const USER_SERVICE_TIMEOUT_MS = 10_000;

export const SESSION_COOKIE = '__Host-relisten_session';
export const CSRF_COOKIE = '__Host-relisten_csrf';
export const CSRF_HEADER = 'X-Relisten-CSRF';
export const WEB_ORIGIN_HEADER = 'X-Relisten-Web-Origin';
