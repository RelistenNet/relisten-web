import type { Codec } from '@timber-js/app/codec';
import { defineCookie } from '@timber-js/app/cookies';
import { CSRF_COOKIE, SESSION_COOKIE } from './config';

// Opaque values from the User Service, passed through as-is.
const tokenCodec: Codec<string | null> = {
  parse: (value) => (typeof value === 'string' && value !== '' ? value : null),
  serialize: (token) => token,
};

/**
 * The User Service's session cookie. The User Service sets it; here it is read,
 * forwarded, keyed on (the nav) and cleared once dead. Present doesn't mean valid;
 * `/account` asks the User Service.
 */
export const sessionCookie = defineCookie(SESSION_COOKIE, { codec: tokenCodec });

/** The User Service's antiforgery cookie: forwarded with the session, cleared with it. */
export const csrfCookie = defineCookie(CSRF_COOKIE, { codec: tokenCodec });
