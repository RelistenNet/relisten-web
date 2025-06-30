import { cookies } from 'next/headers';
import { FilterState, getFilterKey } from './filterCookies';

const COOKIE_PREFIX = 'relisten_filters_';

// Server-side function to read filter cookies
export async function getServerFilters(pathname: string): Promise<FilterState> {
  const cookieStore = await cookies();
  const key = getFilterKey(pathname);
  const cookieName = `${COOKIE_PREFIX}${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  try {
    const value = cookieStore.get(cookieName)?.value;
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error('Error parsing filter cookie on server:', error);
  }

  return {};
}
