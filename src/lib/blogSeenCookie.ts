import type { Codec } from '@timber-js/app/codec';
import { defineCookie } from '@timber-js/app/cookies';

const stringCodec: Codec<string | null> = {
  parse(value: string | string[] | undefined): string | null {
    if (value === undefined || value === '') return null;
    return Array.isArray(value) ? (value[value.length - 1] ?? null) : value;
  },
  serialize(value: string | null): string | null {
    return value;
  },
};

export const blogSeenCookie = defineCookie('relisten_blog_seen', {
  codec: stringCodec,
  httpOnly: false,
  maxAge: 90 * 24 * 60 * 60,
  sameSite: 'lax',
  path: '/',
});
