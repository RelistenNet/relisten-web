'use client';

import { useFilterState } from '@/hooks/useFilterState';
import { Show } from '@/types';
import { useSegmentParams } from '@timber-js/app/client';
import { useMemo } from 'react';
import sortActiveBands from '../lib/sortActiveBands';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { durationToHHMMSS, removeLeadingZero, splitShowDate } from '../lib/utils';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Count from './Count';
import Flex from './Flex';
import PopularityBadge from './PopularityBadge';
import Row, { unwrapSegment } from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';

type ShowsColumnWithControlsProps = {
  artistSlug?: string;
  year?: string;
  shows: Show[];
  fullDate?: boolean;
  quickHitSegment?: string;
  quickHitSlug?: string;
};

const ShowsColumnWithControls = ({
  artistSlug,
  year,
  shows,
  fullDate,
  quickHitSegment,
  quickHitSlug,
}: ShowsColumnWithControlsProps) => {
  const { alphaAsc, sortBy, setSortBy, sbdOnly, toggleFilter, clearFilters } = useFilterState(
    `${artistSlug}:shows`,
    'alpha'
  );
  const params = useSegmentParams() as Record<string, string | string[] | undefined>;
  const [{ date: activeDate }] = slugSearchParams.useQueryStates();
  const dateParts = activeDate?.split('-');
  const currentMonth = dateParts?.[1] ?? unwrapSegment(params.month);
  const currentDay = dateParts?.[2] ?? unwrapSegment(params.day);

  const dirIcon = alphaAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  const toggles = [
    {
      type: 'sort' as const,
      isActive: sortBy === 'alpha',
      isDefault: sortBy === 'alpha' && !alphaAsc,
      onToggle: () => setSortBy('alpha'),
      title: sortBy === 'alpha' ? (alphaAsc ? 'Oldest First' : 'Newest First') : 'Sort by date',
      label: 'Date',
      icon: sortBy === 'alpha' ? dirIcon : undefined,
    },
    {
      type: 'sort' as const,
      isActive: sortBy === 'popularity',
      onToggle: () => setSortBy('popularity'),
      title:
        sortBy === 'popularity'
          ? alphaAsc
            ? 'Least popular'
            : 'Most popular'
          : 'Sort by popularity',
      label: 'Pop',
      icon: sortBy === 'popularity' ? dirIcon : undefined,
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

    if (sortBy === 'popularity') {
      const dir = alphaAsc ? -1 : 1;
      processedShows.sort((a, b) => {
        const ap = a.popularity?.windows?.['30d']?.plays ?? 0;
        const bp = b.popularity?.windows?.['30d']?.plays ?? 0;
        return dir * (bp - ap);
      });
    } else {
      if (artistSlug) {
        processedShows = sortActiveBands(artistSlug, processedShows);
      }
      if (!alphaAsc) {
        processedShows.reverse();
      }
    }

    return processedShows;
  }, [shows, artistSlug, alphaAsc, sortBy, sbdOnly]);

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

          if (tour) {
            if (!tours[tour.id]) tourName = tour.name ?? '';
            tours[tour.id] = true;
          }

          const showHref = quickHitSegment
            ? slugSearchParams.href(`/${artistSlug}/${quickHitSegment}`, {
                slug: quickHitSlug,
                date: `${year}-${month}-${day}`,
              })
            : `/${artistSlug}/${year}/${month}/${day}`;

          return (
            <div key={show.uuid}>
              {!fullDate && tourName && tourName !== 'Not Part of a Tour' && (
                <RowHeader>{tourName}</RowHeader>
              )}
              <Row
                href={showHref}
                active={month === currentMonth && day === currentDay}
              >
                <div>
                  <Flex className="tabular-nums">
                    {fullDate ? `${year}-${month}-${day}` : `${removeLeadingZero(month)}/${day}`}
                    {show.has_soundboard_source && <Tag>SBD</Tag>}
                  </Flex>
                  {venue && (
                    <div className="text-xxs text-foreground-muted my-0.5 leading-3.5">
                      <div>{venue.name}</div>
                      <div>{venue.location}</div>
                    </div>
                  )}
                </div>
                <div className="text-xxs text-foreground-muted flex h-full min-w-[20%] flex-col justify-between text-right">
                  <PopularityBadge popularity={show.popularity} align="right" />
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

export default ShowsColumnWithControls;
