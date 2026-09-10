// PKCE (RFC 7636) helpers for the interim web OIDC login flow.
// Server-only: the PKCE transaction (verifier/challenge/state generation) now runs in the
// /auth/login route handler, not the browser — see oidcLogin.ts. Web Crypto (crypto.getRandomValues,
// crypto.subtle) and btoa are both available as Node globals, so this module is unchanged from its
// original browser-only form.
import 'server-only';

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

// verifier length of 32 random bytes -> 43 base64url chars, within the 43-128 range RFC 7636 requires.
export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function generateState(): string {
  return base64UrlEncode(randomBytes(16));
}
