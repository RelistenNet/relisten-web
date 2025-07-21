'use client';

import { useState, useMemo, useCallback } from 'react';
import MiniSearch from 'minisearch';

interface UseSearchFilterOptions<T> {
  items: T[];
  searchFields: string[];
  idField?: string;
  searchOptions?: {
    prefix?: boolean;
    fuzzy?: boolean | number;
    boost?: Record<string, number>;
  };
}

export function useSearchFilter<T extends Record<string, any>>({
  items,
  searchFields,
  idField = 'uuid',
  searchOptions = { prefix: true, fuzzy: 0.2 },
}: UseSearchFilterOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const miniSearch = useMemo(() => {
    const ms = new MiniSearch<T>({
      fields: searchFields,
      idField,
      searchOptions: {
        boost: searchOptions.boost,
        fuzzy: searchOptions.fuzzy,
        prefix: searchOptions.prefix,
      },
    });

    // Index all items
    if (items.length > 0) {
      ms.addAll(items);
    }

    return ms;
  }, [items, searchFields, idField, searchOptions]);

  const filteredItems = useMemo(() => {
    if (!searchTerm || !searchTerm?.trim()) {
      return items;
    }

    try {
      const searchResults = miniSearch.search(searchTerm);
      const resultIds = new Set(searchResults.map((result) => result.id));

      // Preserve original order
      return items.filter((item) => resultIds.has(item[idField]));
    } catch (error) {
      // If search fails (e.g., invalid query), return all items
      console.warn('Search error:', error);
      return items;
    }
  }, [items, searchTerm, miniSearch, idField]);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm: handleSearch,
    filteredItems,
    clearSearch,
    isSearching: searchTerm.length > 0,
  };
}
