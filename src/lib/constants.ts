// Client-side API domain (always public, used by browser code)
export const API_DOMAIN = 'https://api.relisten.net';

// Server-side API domain (in-cluster in prod, falls back to public in dev)
export const SERVER_API_DOMAIN = process.env.RELISTEN_API_URL || API_DOMAIN;

export const METADATA_BASE = new URL('https://timber.relisten.net');

// Interim (PKCE + Bearer) auth config — see auth-plan.md "Interim approach".
// TODO(accounts): stub values. Replace once the backend owner registers a public
// web OIDC client and confirms the accounts/auth hostnames for this phase.
//
// In Development, points at the local User Service started per
// RelistenApi/local-dev/README.md (`dotnet run --project RelistenUserService/...`,
// loopback issuer at localhost:5443). Never true in a production build.
const isDev = process.env.NODE_ENV === 'development';

export const ACCOUNTS_API_URL = isDev ? 'http://localhost:5443' : 'https://accounts.relisten.net';
export const ACCOUNTS_AUTH_URL = isDev ? 'http://localhost:5443' : 'https://auth.relisten.net';
export const ACCOUNTS_CLIENT_ID = 'relisten-web-interim';
export const ACCOUNTS_REDIRECT_URI = isDev
  ? 'http://localhost:3000/auth/callback'
  : 'https://relisten.net/auth/callback';
export const ACCOUNTS_FEATURE_ENABLED = isDev;
