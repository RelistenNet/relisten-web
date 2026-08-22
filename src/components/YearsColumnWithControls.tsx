'use client';

import { Year } from '@/types';
import { PropsWithChildren, useMemo } from 'react';
import { useSegmentParams } from '@timber-js/app/client';
import { useFilterState } from '@/hooks/useFilterState';
import { ArrowUp, ArrowDown } from 'lucide-react';
import sortActiveBands from '../lib/sortActiveBands';
import Count from './Count';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import PopularityBadge from './PopularityBadge';
import Row, { unwrapSegment } from './Row';

type YearsColumnWithControlsProps = {
  artistSlug?: string;
  artistName?: string;
  artistYears: Year[];
} & PropsWithChildren;

const YearsColumnWithControls = ({
  artistSlug,
  artistName,
  artistYears,
  children,
}: YearsColumnWithControlsProps) => {
  const { alphaAsc, sortBy, setSortBy, clearFilters } = useFilterState(artistSlug, 'alpha');
  const params = useSegmentParams() as Record<string, string | string[] | undefined>;
  const currentYear = unwrapSegment(params.year);

  const dirIcon = alphaAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  const toggles = [
    {
      type: 'sort' as const,
      isActive: sortBy === 'alpha',
      onToggle: () => setSortBy('alpha'),
      title: sortBy === 'alpha' ? (alphaAsc ? 'Oldest First' : 'Newest First') : 'Sort by date',
      label: 'Date',
      icon: sortBy === 'alpha' ? dirIcon : undefined,
    },
    {
      type: 'sort' as const,
      isActive: sortBy === 'popularity',
      isDefault: sortBy === 'popularity' && !alphaAsc,
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
  ];

  const processedYears = useMemo(() => {
    let years = [...artistYears];

    if (sortBy === 'popularity') {
      const dir = alphaAsc ? -1 : 1;
      years.sort((a, b) => {
        const ap = a.popularity?.windows?.['30d']?.plays ?? 0;
        const bp = b.popularity?.windows?.['30d']?.plays ?? 0;
        return dir * (bp - ap);
      });
    } else {
      if (artistSlug) {
        years = sortActiveBands(artistSlug, years);
      }
      if (!alphaAsc) {
        years.reverse();
      }
    }

    return years;
  }, [artistYears, artistSlug, alphaAsc, sortBy]);

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
            key={yearObj.uuid}
            href={`/${artistSlug}/${yearObj.year}`}
            active={yearObj.year === currentYear}
          >
            <div>
              <div className="flex items-center gap-1">
                <div>{yearObj.year}</div>
                {yearObj.has_soundboard_source && (
                  <span className="rounded bg-green-500/20 px-1 text-[10px] text-green-700">
                    SBD
                  </span>
                )}
              </div>
              <PopularityBadge popularity={yearObj.popularity} />
            </div>
            <div className="text-xxs min-w-[20%] text-right">
              <div>
                <Count unit="show" value={yearObj.show_count} />
              </div>
              <div>
                <Count unit="tape" value={yearObj.source_count} />
              </div>
            </div>
          </Row>
        ))}
    </ColumnWithToggleControls>
  );
};

export default YearsColumnWithControls;
