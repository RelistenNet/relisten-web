import { getCookies } from '@timber-js/app/server';
import { FilterState, getFilterKey } from './filterCookies';

const COOKIE_PREFIX = 'relisten_filters_';

// Server-side function to read filter cookies
export async function getServerFilters(pathOrKey: string, useAsKey = false): Promise<FilterState> {
  const cookieStore = await getCookies();
  const key = useAsKey ? pathOrKey : getFilterKey(pathOrKey);
  const cookieName = `${COOKIE_PREFIX}${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  try {
    const value = cookieStore.get(cookieName);
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error('Error parsing filter cookie on server:', error);
  }

  return {};
}
