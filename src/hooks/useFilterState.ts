'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import useCookie from 'react-use-cookie';
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

export function useFilterState(initialFilters?: FilterState, filterKey?: string) {
  const pathname = usePathname();

  // Generate cookie name based on custom key or pathname
  const cookieName = useMemo(() => {
    const key = filterKey || getFilterKey(pathname);
    return `relisten_filters_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }, [pathname, filterKey]);

  // Use the cookie hook with initial value from server
  const defaultValue = initialFilters ? JSON.stringify(initialFilters) : '{}';
  const [cookieValue, setCookieValue] = useCookie(cookieName, defaultValue);

  // Parse the filter state from cookie
  const filters = useMemo(() => {
    try {
      return JSON.parse(cookieValue) as FilterState;
    } catch {
      return {} as FilterState;
    }
  }, [cookieValue]);

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

      setCookieValue(JSON.stringify(newFilters), { days: 365, SameSite: 'Lax' });
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
    setCookieValue('{}', { days: 365, SameSite: 'Lax' });
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
