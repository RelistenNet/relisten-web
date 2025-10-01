'use server';

import { cookies } from 'next/headers';

const THEME_COOKIE_NAME = 'relisten_theme';

export type Theme = 'light' | 'dark';

export async function getTheme(): Promise<Theme | null> {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME);
  return (themeCookie?.value as Theme) || null;
}

export async function setTheme(theme: Theme) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, theme, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });
}

