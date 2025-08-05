'use client';

import { Year } from '@/types';
import { PropsWithChildren, useMemo } from 'react';
import { useFilterState } from '@/hooks/useFilterState';
import { FilterState } from '@/lib/filterCookies';
import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';
import { Heart } from 'lucide-react';
import { useFavoriteState } from '@/hooks/useFavoriteState';
import cn from '@/lib/cn';

type YearsColumnWithControlsProps = {
  artistSlug?: string;
  artistName?: string;
  artistYears: Year[];
  artistId?: string;
  initialFilters?: FilterState;
  initialFavorites: string[];
} & PropsWithChildren;

const YearsColumnWithControls = ({
  artistSlug,
  artistName,
  artistYears,
  artistId,
  children,
  initialFilters,
  initialFavorites,
}: YearsColumnWithControlsProps) => {
  const { dateAsc, sbdOnly, toggleFilter, clearFilters } = useFilterState(
    initialFilters,
    artistSlug
  );

  const { toggleFavorite, isFavorite } = useFavoriteState(initialFavorites);

  const toggles = [
    {
      type: 'sort' as const,
      isActive: dateAsc, // Show as active when oldest first (ascending)
      onToggle: () => toggleFilter('date'),
      title: !dateAsc ? 'Newest First' : 'Oldest First',
    },
    {
      type: 'favorite' as const,
      isActive: isFavorite(artistId!),
      onToggle: () => toggleFavorite(artistId!),
      title: isFavorite(artistId!) ? 'Unfavorite' : 'Favorite',
      icon: <Heart size={20} className={cn(isFavorite(artistId!) ? 'fill-white' : 'text-white')} />,
    },
  ];

  const processedYears = useMemo(() => {
    let years = [...artistYears];

    // Apply sorting
    if (artistSlug) {
      years = sortActiveBands(artistSlug, years);
    }

    // Reverse if needed (default is desc/newest first when no filter set)
    if (!dateAsc) {
      years.reverse(); // Change to oldest first
    }

    return years;
  }, [artistYears, artistSlug, dateAsc, sbdOnly]);

  return (
    <ColumnWithToggleControls
      heading={artistName ?? 'Years'}
      toggles={toggles}
      filteredCount={processedYears.length}
      totalCount={artistYears.length}
      onClearFilters={clearFilters}
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
