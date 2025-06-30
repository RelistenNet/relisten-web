'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import useCookie from 'react-use-cookie';
import { FilterState, getFilterKey } from '@/lib/filterCookies';

export function useFilterState(initialFilters?: FilterState) {
  const pathname = usePathname();

  // Generate cookie name based on pathname
  const cookieName = useMemo(() => {
    const key = getFilterKey(pathname);
    return `relisten_filters_${key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  }, [pathname]);

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
      if (value === undefined || value === false || value === 'asc') {
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
        const newValue = currentValue === 'desc' ? 'asc' : 'desc';
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
    dateDesc: filters.date === 'desc',
    sbdOnly: filters.sbd === true,
    alphaDesc: filters.alpha === 'desc',
  };
}
