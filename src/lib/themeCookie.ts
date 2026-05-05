import { defineCookie, jsonCookieCodec } from '@timber-js/app/cookies';

export type ThemeMode = 'system' | 'light' | 'dark';

export const themeCookie = defineCookie('relisten_theme', {
  codec: jsonCookieCodec<ThemeMode>('system'),
  httpOnly: false,
  maxAge: 365 * 24 * 60 * 60,
  sameSite: 'lax',
  path: '/',
});
