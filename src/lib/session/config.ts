import 'server-only';
import { getDeploymentEnvironment } from '@/lib/deployment/server';

/** `pnpm dev:session`: the app talks to a local User Service on the local HTTPS origin. */
export const localSession = process.env.RELISTEN_WEB_SESSION === '1';

const LOCAL_WEB_ORIGIN = 'https://web.relisten.localhost:5173';

/**
 * The browser-visible origin of this deployment. Cookie-authenticated mutations
 * must send it as `Origin`, matching the origin recorded on the session. Read per
 * request so one image can serve production or any preview. Never derived from
 * the Host header.
 */
export function webOrigin(): string {
  if (process.env.RELISTEN_WEB_ORIGIN) return process.env.RELISTEN_WEB_ORIGIN;
  if (localSession) return LOCAL_WEB_ORIGIN;
  const deployment = getDeploymentEnvironment();
  return deployment.kind === 'production' ? 'https://relisten.net' : deployment.url;
}

/**
 * Where server-side session calls go: the local accounts host under
 * `dev:session`, staging's own host on staging (the User Service binds sessions
 * to the origin they were made on), otherwise relisten.net. Previews set
 * RELISTEN_USER_SERVICE_URL to their in-cluster gateway route, which supplies
 * the preview's origin itself.
 */
const deployment = getDeploymentEnvironment();
export const USER_SERVICE_URL =
  process.env.RELISTEN_USER_SERVICE_URL ??
  (localSession
    ? 'https://accounts.relisten.localhost:5443'
    : deployment.kind === 'staging'
      ? deployment.url
      : 'https://relisten.net');

if (deployment.kind === 'preview' && !process.env.RELISTEN_USER_SERVICE_URL) {
  console.warn(
    '[session] RELISTEN_USER_SERVICE_URL is unset on a preview; session lookups go to relisten.net and will read as signed out.'
  );
}

/** The OIDC issuer / SSO-cookie host. Logout bounces through it to clear the SSO cookie. */
export const AUTH_ORIGIN =
  process.env.RELISTEN_AUTH_ORIGIN ??
  (localSession ? 'https://localhost:5443' : 'https://auth.relisten.net');

/** Every User Service call is aborted after this; the page renders its failure state instead. */
export const USER_SERVICE_TIMEOUT_MS = 10_000;

export const SESSION_COOKIE = '__Host-relisten_session';
export const CSRF_COOKIE = '__Host-relisten_csrf';
export const CSRF_HEADER = 'X-Relisten-CSRF';
export const WEB_ORIGIN_HEADER = 'X-Relisten-Web-Origin';
