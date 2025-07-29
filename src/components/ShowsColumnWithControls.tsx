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

type ShowsColumnWithControlsProps = {
  artistSlug?: string;
  year?: string;
  venueId?: string;
  shows: Show[];
  initialFilters?: FilterState;
};

const ShowsColumnWithControls = ({
  artistSlug,
  year,
  venueId,
  shows,
  initialFilters,
}: ShowsColumnWithControlsProps) => {
  const isVenue = !!venueId;
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

  const tours = {};

  return (
    <ColumnWithToggleControls
      heading={year ? year : 'Shows'}
      toggles={toggles}
      filteredCount={processedShows.length}
      totalCount={shows.length}
      onClearFilters={clearFilters}
    >
      {processedShows &&
        artistSlug &&
        processedShows.map((show) => {
          const { year, month, day } = splitShowDate(show.display_date);
          const { venue, avg_duration, tour } = show;
          let tourName = '';

          // keep track of which tours we've displayed
          if (tour) {
            if (!tours[tour.id]) tourName = tour.name ?? '';

            tours[tour.id] = true;
          }

          return (
            <div key={show.id}>
              {tourName && (
                <RowHeader>{tourName === 'Not Part of a Tour' ? '' : tourName}</RowHeader>
              )}
              <Row
                href={`/${artistSlug}/${year}/${month}/${day}`}
                activeSegments={{
                  year,
                  month,
                  day,
                }}
              >
                <div>
                  <Flex className="tabular-nums">
                    {/* TODO: Only display year on venue endpoint */}
                    {removeLeadingZero(month)}/{day}
                    {isVenue && '/' + year}
                    {show.has_soundboard_source && <Tag>SBD</Tag>}
                  </Flex>
                  {venue && (
                    <div className="text-xxs text-foreground-muted my-0.5 leading-3.5">
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

export default ShowsColumnWithControls;
