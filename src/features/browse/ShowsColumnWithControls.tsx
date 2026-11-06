'use client';

import { useFilterState } from '@/hooks/useFilterState';
import type { SlimShow } from '@/lib/slimShow';
import { useSegmentParams } from '@timber-js/app/client';
import { Fragment, useMemo } from 'react';
import sortActiveBands from '@/lib/sortActiveBands';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { durationToHHMMSS, removeLeadingZero, splitShowDate } from '@/lib/utils';
import { Link } from '@timber-js/app/client';
import ColumnWithToggleControls from '@/components/ColumnWithToggleControls';
import Count from '@/components/Count';
import Flex from '@/components/Flex';
import PopularityBadge from '@/components/PopularityBadge';
import Row, { unwrapSegment } from '@/components/Row';
import RowHeader from '@/components/RowHeader';
import Tag from '@/components/Tag';

type ShowsColumnWithControlsProps = {
  artistSlug?: string;
  year?: string;
  shows: SlimShow[];
  fullDate?: boolean;
};

const ShowsColumnWithControls = ({
  artistSlug,
  year,
  shows,
  fullDate,
}: ShowsColumnWithControlsProps) => {
  const { alphaAsc, sortBy, setSortBy, sbdOnly, toggleFilter, clearFilters } = useFilterState(
    `${artistSlug}:shows`,
    'alpha'
  );
  const params = useSegmentParams() as Record<string, string | string[] | undefined>;
  const currentMonth = unwrapSegment(params.month);
  const currentDay = unwrapSegment(params.day);

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
    ...(!fullDate
      ? [
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
        ]
      : []),
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

          const showHref = `/${artistSlug}/${year}/${month}/${day}`;

          return (
            <Fragment key={show.id}>
              {!fullDate && tourName && tourName !== 'Not Part of a Tour' && (
                <RowHeader>{tourName}</RowHeader>
              )}
              <Row href={showHref} active={month === currentMonth && day === currentDay}>
                <div>
                  <Flex className="tabular-nums">
                    {fullDate ? `${year}-${month}-${day}` : `${removeLeadingZero(month)}/${day}`}
                    {show.has_soundboard_source && <Tag>SBD</Tag>}
                  </Flex>
                  {venue && (
                    <div className="my-0.5 text-xxs leading-3.5 text-foreground-muted">
                      <div>{venue.name}</div>
                      <div>{venue.location}</div>
                    </div>
                  )}
                </div>
                <div className="flex min-w-[20%] flex-col self-stretch justify-between text-right text-xxs text-foreground-muted">
                  <PopularityBadge popularity={show.popularity} align="right" />
                  <div>{durationToHHMMSS(avg_duration)}</div>
                  <Count unit="tape" value={show.source_count} />
                </div>
              </Row>
            </Fragment>
          );
        })}
    </ColumnWithToggleControls>
  );
};

export default ShowsColumnWithControls;
