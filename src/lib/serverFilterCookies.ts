import { type FilterState, getFilterKey, getFilterCookie } from './filterCookies';

// Server-side function to read filter cookies
export function getServerFilters(pathOrKey: string, useAsKey = false): FilterState {
  const key = useAsKey ? pathOrKey : getFilterKey(pathOrKey);
  return getFilterCookie(key).get();
}
