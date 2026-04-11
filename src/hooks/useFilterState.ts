'use client';

import { usePathname } from '@timber-js/app/client';
import { useCallback, useMemo } from 'react';
import {
  SORT_DIRECTION,
  type FilterState,
  getFilterKey,
  getFilterCookie,
} from '@/lib/filterCookies';

export { SORT_DIRECTION } from '@/lib/filterCookies';

export const DEFAULT_FILTERS = {
  date: SORT_DIRECTION.desc,
  alpha: SORT_DIRECTION.desc,
  sbd: undefined,
};

const getInverse = (key: string, sort?: SORT_DIRECTION) => {
  if (sort === undefined) return getInverse(key, DEFAULT_FILTERS[key]);

  if (sort === SORT_DIRECTION.asc) return SORT_DIRECTION.desc;
  if (sort === SORT_DIRECTION.desc) return SORT_DIRECTION.asc;

  return undefined;
};

export function useFilterState(initialFilters?: FilterState, filterKey?: string) {
  const pathname = usePathname();

  const key = useMemo(() => filterKey || getFilterKey(pathname), [pathname, filterKey]);

  const cookie = getFilterCookie(key);
  const [cookieValue, setCookieValue] = cookie.useCookie();

  const filters = useMemo(() => {
    if (cookieValue && Object.keys(cookieValue).length > 0) {
      return cookieValue;
    }
    return initialFilters ?? ({} as FilterState);
  }, [cookieValue, initialFilters]);

  const setFilter = useCallback(
    <K extends keyof FilterState>(filterName: K, value: FilterState[K]) => {
      const newFilters = { ...filters, [filterName]: value };

      // Remove the filter if it's set to default value
      if (value === undefined || value === false) {
        delete newFilters[filterName];
      }

      setCookieValue(newFilters);
    },
    [filters, setCookieValue]
  );

  const toggleFilter = useCallback(
    (filterName: keyof FilterState) => {
      if (filterName === 'sbd') {
        setFilter('sbd', !filters.sbd);
      } else if (filterName === 'date' || filterName === 'alpha') {
        const currentValue = filters[filterName];
        const newValue = getInverse(filterName, currentValue);
        console.log(filters, filterName, newValue, currentValue);
        setFilter(filterName, newValue);
      }
    },
    [filters, setFilter]
  );

  const clearFilters = useCallback(() => {
    setCookieValue({});
  }, [setCookieValue]);

  return {
    filters,
    setFilter,
    toggleFilter,
    clearFilters,
    // Computed values for easier use
    alphaAsc: filters.alpha === SORT_DIRECTION.asc,
    dateAsc: filters.date === SORT_DIRECTION.asc,
    sbdOnly: filters.sbd === true,
  };
}
