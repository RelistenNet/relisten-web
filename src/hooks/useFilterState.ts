'use client';

import { usePathname } from '@timber-js/app/client';
import { useCallback, useMemo } from 'react';
import { useCookie } from '@timber-js/app/client';
import { FilterState, getFilterKey } from '@/lib/filterCookies';

export enum SORT_DIRECTION {
  desc = 'desc',
  asc = 'asc',
}

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

const COOKIE_OPTIONS = { maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' as const };

export function useFilterState(initialFilters?: FilterState, filterKey?: string) {
  const pathname = usePathname();

  // Generate cookie name based on custom key or pathname
  const cookieName = useMemo(() => {
    const key = filterKey || getFilterKey(pathname);
    return `relisten_filters_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }, [pathname, filterKey]);

  // Use timber's cookie hook
  const [cookieValue, setCookieValue] = useCookie(cookieName, COOKIE_OPTIONS);

  // Parse the filter state from cookie, with fallback to initial filters
  const filters = useMemo(() => {
    if (cookieValue) {
      try {
        return JSON.parse(cookieValue) as FilterState;
      } catch {
        // fall through
      }
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
      // For both date and alpha, default is desc (newest first for dates, A-Z for alpha)
      if (
        (filterName === 'date' && value === DEFAULT_FILTERS[filterName]) ||
        (filterName === 'alpha' && value === DEFAULT_FILTERS[filterName])
      ) {
        delete newFilters[filterName];
      }

      setCookieValue(JSON.stringify(newFilters));
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
        console.log(filterName, newValue, currentValue);
        setFilter(filterName, newValue);
      }
    },
    [filters, setFilter]
  );

  const clearFilters = useCallback(() => {
    setCookieValue('{}');
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
