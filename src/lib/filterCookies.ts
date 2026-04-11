import { defineCookie, jsonCookieCodec } from '@timber-js/app/cookies';
import type { CookieDefinition } from '@timber-js/app/cookies';

export enum SORT_DIRECTION {
  desc = 'desc',
  asc = 'asc',
}

export type FilterState = {
  date?: SORT_DIRECTION;
  sbd?: boolean;
  alpha?: SORT_DIRECTION;
};

export type FilterKey = string; // e.g., "/grateful-dead:filters" or "/grateful-dead/1977:filters"

const COOKIE_PREFIX = 'relisten_filters_';

const filterCookieCache = new Map<string, CookieDefinition<FilterState>>();

export function getFilterCookie(key: string): CookieDefinition<FilterState> {
  let cookie = filterCookieCache.get(key);

  if (!cookie) {
    const cookieName = `${COOKIE_PREFIX}${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    cookie = defineCookie(cookieName, {
      codec: jsonCookieCodec<FilterState>({}),
      httpOnly: false,
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
      path: '/',
    });
    filterCookieCache.set(key, cookie);
  }
  return cookie;
}

// Get filter key based on pathname
export function getFilterKey(pathname: string): FilterKey {
  // Remove trailing slashes
  const cleanPath = pathname.replace(/\/$/, '');

  // For artist pages like /grateful-dead, /phish, etc.
  const artistMatch = cleanPath.match(/^\/([a-z-]+)$/);
  if (artistMatch) {
    return `${cleanPath}:filters`;
  }

  // For year pages like /grateful-dead/1977, /phish/1998, etc.
  const yearMatch = cleanPath.match(/^\/([a-z-]+)\/\d{4}$/);
  if (yearMatch) {
    // Use the artist-level filters for year pages
    return `/${yearMatch[1]}:filters`;
  }

  // For show pages like /grateful-dead/1977/05/08, use artist-level filters
  const showMatch = cleanPath.match(/^\/([a-z-]+)\/\d{4}\/\d{2}\/\d{2}$/);
  if (showMatch) {
    return `/${showMatch[1]}:filters`;
  }

  // For other pages, use the full path
  return `${cleanPath}:filters`;
}
