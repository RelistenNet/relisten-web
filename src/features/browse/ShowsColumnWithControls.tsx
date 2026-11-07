'use client';

import { href } from '@timber-js/app/routes';
import { useFilterState } from '@/hooks/useFilterState';
import type { ShowSummary } from '@/domain/types';
import { useSegmentParams } from '@timber-js/app/client';
import { Fragment, useMemo } from 'react';
import sortActiveBands from '@/lib/sortActiveBands';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { durationToHHMMSS, removeLeadingZero, splitShowDate } from '@/lib/utils';
import { Link } from '@timber-js/app/client';
import ColumnWithToggleControls from '@/ui/base/ColumnWithToggleControls';
import Count from '@/ui/base/Count';
import Flex from '@/ui/base/Flex';
import PopularityBadge from '@/ui/base/PopularityBadge';
import Row, { unwrapSegment } from '@/ui/base/Row';
import RowHeader from '@/ui/base/RowHeader';
import Tag from '@/ui/base/Tag';

/** A year's show, cut to what this column reads: the list ships in the page's Flight payload. */
export type BrowseShow = Pick<
  ShowSummary,
  'id' | 'date' | 'tourName' | 'tapes' | 'sbd' | 'avgDuration' | 'popularity'
> & { venue?: { name?: string; location?: string } };

type ShowsColumnWithControlsProps = {
  artistSlug?: string;
  year?: string;
  shows: BrowseShow[];
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
      processedShows = processedShows.filter((show) => show.sbd);
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

  // Each tour's header goes above its first show only.
  const tours: Record<string, true> = {};

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
          const { year, month, day } = splitShowDate(show.date);
          const { venue, avgDuration } = show;
          let tourName = '';

          if (show.tourName) {
            if (!tours[show.tourName]) tourName = show.tourName;
            tours[show.tourName] = true;
          }

          const showHref = href('/[artistSlug]/[year]/[month]/[day]', {
            artistSlug,
            year,
            month,
            day,
          });

          return (
            <Fragment key={show.id}>
              {!fullDate && tourName && <RowHeader>{tourName}</RowHeader>}
              <Row href={showHref} active={month === currentMonth && day === currentDay}>
                <div>
                  <Flex className="tabular-nums">
                    {fullDate ? `${year}-${month}-${day}` : `${removeLeadingZero(month)}/${day}`}
                    {show.sbd && <Tag>SBD</Tag>}
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
                  <div>{durationToHHMMSS(avgDuration ?? undefined)}</div>
                  <Count unit="tape" value={show.tapes} />
                </div>
              </Row>
            </Fragment>
          );
        })}
    </ColumnWithToggleControls>
  );
};

export default ShowsColumnWithControls;
