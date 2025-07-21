'use client';

import { Year } from '@/types';
import { PropsWithChildren, useMemo } from 'react';
import { useFilterState } from '@/hooks/useFilterState';
import { useSearchFilter } from '@/hooks/useSearchFilter';
import { FilterState } from '@/lib/filterCookies';
import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';

type YearsColumnWithControlsProps = {
  artistSlug?: string;
  artistName?: string;
  artistYears: Year[];
  initialFilters?: FilterState;
} & PropsWithChildren;

const YearsColumnWithControls = ({
  artistSlug,
  artistName,
  artistYears,
  children,
  initialFilters,
}: YearsColumnWithControlsProps) => {
  const { dateAsc, sbdOnly, toggleFilter, clearFilters } = useFilterState(
    initialFilters,
    artistSlug
  );
  console.log(artistYears);

  const {
    searchTerm,
    setSearchTerm,
    filteredItems: searchFilteredYears,
    clearSearch,
  } = useSearchFilter({
    items: artistYears,
    searchFields: ['year'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.1,
    },
  });

  const toggles = [
    {
      type: 'sort' as const,
      isActive: dateAsc, // Show as active when oldest first (ascending)
      onToggle: () => toggleFilter('date'),
      title: !dateAsc ? 'Newest First' : 'Oldest First',
    },
  ];

  const processedYears = useMemo(() => {
    let years = [...searchFilteredYears];

    // Apply sorting
    if (artistSlug) {
      years = sortActiveBands(artistSlug, years);
    }

    // Reverse if needed (default is desc/newest first when no filter set)
    if (!dateAsc) {
      years.reverse(); // Change to oldest first
    }

    return years;
  }, [searchFilteredYears, artistSlug, dateAsc]);

  return (
    <ColumnWithToggleControls
      heading={artistName ?? 'Years'}
      toggles={toggles}
      filteredCount={processedYears.length}
      totalCount={artistYears.length}
      onClearFilters={() => {
        clearFilters();
        clearSearch();
      }}
      showDisplayToggle
      artistSlug={artistSlug}
      showSearch={true}
      searchTerm={searchTerm}
      onSearch={setSearchTerm}
    >
      {children}
      {artistSlug &&
        processedYears.length > 0 &&
        processedYears.map((yearObj) => (
          <Row
            key={yearObj.id}
            href={`/${artistSlug}/${yearObj.year}`}
            activeSegments={{ year: yearObj.year }}
          >
            <div className="flex items-center gap-1">
              <div>{yearObj.year}</div>
              {yearObj.has_soundboard_source && (
                <span className="rounded bg-green-500/20 px-1 text-[10px] text-green-700">SBD</span>
              )}
            </div>
            <div className="text-xxs text-foreground-muted min-w-[20%] text-right">
              <div>{simplePluralize('show', yearObj.show_count)}</div>
              <div>{simplePluralize('tape', yearObj.source_count)}</div>
            </div>
          </Row>
        ))}
    </ColumnWithToggleControls>
  );
};

export default YearsColumnWithControls;
