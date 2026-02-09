'use client';

import { useMemo } from 'react';
import { durationToHHMMSS, removeLeadingZero, simplePluralize, splitShowDate } from '../lib/utils';
import { Show } from '@/types';
import { useFilterState } from '@/hooks/useFilterState';
import { FilterState } from '@/lib/filterCookies';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Flex from './Flex';
import Row from './Row';
import Tag from './Tag';

type TopTapesColumnWithControlsProps = {
  artistSlug?: string;
  year?: string;
  shows: Show[];
  initialFilters?: FilterState;
};

const TopTapesColumnWithControls = ({
  artistSlug,
  year,
  shows,
  initialFilters,
}: TopTapesColumnWithControlsProps) => {
  const { dateAsc, sbdOnly, toggleFilter, clearFilters } = useFilterState(
    initialFilters,
    `${artistSlug}:shows`
  );

  const toggles = [
    {
      type: 'sort' as const,
      isActive: dateAsc,
      onToggle: () => toggleFilter('date'),
      title: !dateAsc ? 'By Rating' : 'By Date',
    },
    {
      type: 'filter' as const,
      isActive: !!sbdOnly,
      onToggle: () => toggleFilter('sbd'),
      title: sbdOnly ? 'All Shows' : 'SBD Only',
      label: 'SBD',
    },
  ];

  const processedShows = useMemo(() => {
    let processedShows = [...shows];

    if (sbdOnly) {
      processedShows = processedShows.filter((show) => show.has_soundboard_source);
    }

    // When dateAsc is toggled, sort by date instead of keeping API rating order
    if (dateAsc) {
      processedShows.sort(
        (a, b) => new Date(a.display_date ?? '').getTime() - new Date(b.display_date ?? '').getTime()
      );
    }

    return processedShows;
  }, [shows, dateAsc, sbdOnly]);

  return (
    <ColumnWithToggleControls
      heading={year ? year : 'Top Tapes'}
      toggles={toggles}
      filteredCount={processedShows.length}
      totalCount={shows.length}
      onClearFilters={clearFilters}
    >
      {(!processedShows || processedShows.length === 0) && (
        <div className="py-2 text-center text-sm text-gray-700">No top rated shows!</div>
      )}
      {processedShows &&
        artistSlug &&
        processedShows.map((show) => {
          const { year, month, day } = splitShowDate(show.display_date);
          const { venue, avg_duration, avg_rating } = show;

          return (
            <div key={show.id}>
              <Row
                href={`/${artistSlug}/${year}/${month}/${day}`}
                activeSegments={{
                  month,
                  day,
                }}
              >
                <div>
                  <Flex>
                    {removeLeadingZero(month)}/{day}/{year}
                    {show.has_soundboard_source && <Tag>SBD</Tag>}
                  </Flex>
                  {venue && (
                    <div className="text-xxs text-foreground-muted">
                      <div>{venue.name}</div>
                      <div>{venue.location}</div>
                    </div>
                  )}
                </div>
                <div className="text-xxs text-foreground-muted flex h-full min-w-[20%] flex-col justify-center gap-2 text-right">
                  {avg_rating != null && <div>{avg_rating.toFixed(1)} ★</div>}
                  <div>{durationToHHMMSS(avg_duration)}</div>
                  <div>{simplePluralize('tape', show.source_count)}</div>
                </div>
              </Row>
            </div>
          );
        })}
    </ColumnWithToggleControls>
  );
};

export default TopTapesColumnWithControls;
