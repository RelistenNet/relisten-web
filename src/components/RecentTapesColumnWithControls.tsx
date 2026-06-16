'use client';

import type { ReactNode } from 'react';
import { useFilterState } from '@/hooks/useFilterState';
import { FilterState } from '@/lib/filterCookies';
import { Show } from '@/types';
import { useSegmentParams } from '@timber-js/app/client';
import { useMemo } from 'react';
import { durationToHHMMSS, splitShowDate } from '../lib/utils';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Count from './Count';
import Flex from './Flex';
import Row, { unwrapSegment } from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';

type RecentTapesColumnWithControlsProps = {
  artistSlug?: string;
  year?: string;
  shows: Show[];
  initialFilters?: FilterState;
  subHeader?: ReactNode;
};

const RecentTapesColumnWithControls = ({
  artistSlug,
  year,
  shows,
  initialFilters,
  subHeader,
}: RecentTapesColumnWithControlsProps) => {
  const { dateAsc, sbdOnly, toggleFilter, clearFilters } = useFilterState(
    initialFilters,
    `${artistSlug}:shows`
  );
  const params = useSegmentParams() as Record<string, string | string[] | undefined>;
  const currentMonth = unwrapSegment(params.month);
  const currentDay = unwrapSegment(params.day);

  const toggles = [
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

    return processedShows;
  }, [shows, artistSlug, dateAsc, sbdOnly]);

  const tours = {};

  return (
    <ColumnWithToggleControls
      heading={year ? year : 'Recently Added'}
      toggles={toggles}
      filteredCount={processedShows.length}
      totalCount={shows.length}
      onClearFilters={clearFilters}
      subHeader={subHeader}
    >
      {(!processedShows || processedShows.length === 0) && (
        <div className="py-2 text-center text-sm text-text-muted">No recently added shows!</div>
      )}
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
                active={month === currentMonth && day === currentDay}
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
                  <div>
                    <Count unit="tape" value={show.source_count} />
                  </div>
                </div>
              </Row>
            </div>
          );
        })}
    </ColumnWithToggleControls>
  );
};

export default RecentTapesColumnWithControls;
