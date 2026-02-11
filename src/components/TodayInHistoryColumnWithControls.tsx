'use client';

import { useMemo } from 'react';
import sortActiveBands from '../lib/sortActiveBands';
import { durationToHHMMSS, removeLeadingZero, simplePluralize, splitShowDate } from '../lib/utils';
import { Show } from '@/types';
import { useFilterState } from '@/hooks/useFilterState';
import { FilterState } from '@/lib/filterCookies';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Flex from './Flex';
import Row from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';
import TodayDateNav from './TodayDateNav';

type TodayInHistoryColumnWithControlsProps = {
  artistSlug?: string;
  year?: string;
  shows: Show[];
  initialFilters?: FilterState;
  month: string;
  day: string;
};

const TodayInHistoryColumnWithControls = ({
  artistSlug,
  year,
  shows,
  initialFilters,
  month,
  day,
}: TodayInHistoryColumnWithControlsProps) => {
  const { dateAsc, sbdOnly, toggleFilter, clearFilters } = useFilterState(
    initialFilters,
    `${artistSlug}:shows`
  );

  const toggles = [
    {
      type: 'sort' as const,
      isActive: dateAsc, // Show as active when oldest first (ascending)
      onToggle: () => toggleFilter('date'),
      title: !dateAsc ? 'Newest First' : 'Oldest First',
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

    // Apply filter
    if (sbdOnly) {
      processedShows = processedShows.filter((show) => show.has_soundboard_source);
    }

    // Apply sorting
    if (artistSlug) {
      processedShows = sortActiveBands(artistSlug, processedShows);
    }

    // Reverse if needed (default is desc/newest first when no filter set)
    if (!dateAsc) {
      processedShows.reverse(); // Change to oldest first
    }

    return processedShows;
  }, [shows, artistSlug, dateAsc, sbdOnly]);

  return (
    <ColumnWithToggleControls
      heading={year ? year : 'Today In History'}
      toggles={toggles}
      filteredCount={processedShows.length}
      totalCount={shows.length}
      onClearFilters={clearFilters}
    >
      {artistSlug && (
        <div className="border-b border-gray-200 px-2 py-2">
          <TodayDateNav month={month} day={day} pathname={`/${artistSlug}/today-in-history`} />
        </div>
      )}
      {(!processedShows || processedShows.length === 0) && (
        <div className="py-2 text-center text-sm text-gray-700">
          No shows on this date, try another day!
        </div>
      )}
      {processedShows &&
        artistSlug &&
        processedShows.map((show) => {
          const { year, month, day } = splitShowDate(show.display_date);
          const { venue, avg_duration, tour } = show;

          return (
            <div key={show.id}>
              <RowHeader>{year}</RowHeader>
              <Row
                href={`/${artistSlug}/${year}/${month}/${day}`}
                activeSegments={{
                  month,
                  day,
                }}
              >
                <div>
                  <Flex>
                    {year}-{month}-{day}
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

export default TodayInHistoryColumnWithControls;
