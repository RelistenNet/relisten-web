import type { Codec } from '@timber-js/app/codec';
import { defineCookie } from '@timber-js/app/cookies';
import { SESSION_COOKIE } from './config';

const tokenCodec: Codec<string | null> = {
  parse: (value) => (typeof value === 'string' && value !== '' ? value : null),
  serialize: (token) => token,
};

/**
 * The User Service's session cookie, for keying layouts on it. Present doesn't
 * mean valid; `/account` asks the User Service.
 */
export const sessionCookie = defineCookie(SESSION_COOKIE, { codec: tokenCodec });
