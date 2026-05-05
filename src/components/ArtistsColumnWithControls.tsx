'use client';

import React, { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSegmentParams } from '@timber-js/app/client';
import { groupBy } from '../lib/utils';
import Count from './Count';
import { Artist } from '../types';
import { useFilterState } from '@/hooks/useFilterState';
import { FilterState } from '@/lib/filterCookies';
import cn from '@/lib/cn';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import PopularityBadge from './PopularityBadge';
import Row, { unwrapSegment } from './Row';
import RowHeader from './RowHeader';

const byObject = {
  phish: 'Phish.in',
};

type Item =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'artist'; key: string; artist: Artist };

const HEADER_ESTIMATE = 28;
const ROW_ESTIMATE = 45;

type ArtistsColumnWithControlsProps = {
  artists: Artist[];
  initialFilters?: FilterState;
  subHeader?: React.ReactNode;
  isPending?: boolean;
};

const ArtistsColumnWithControls = ({
  artists,
  initialFilters,
  subHeader,
  isPending,
}: ArtistsColumnWithControlsProps) => {
  const { alphaAsc, toggleFilter, clearFilters } = useFilterState(initialFilters, 'root');
  const params = useSegmentParams() as Record<string, string | string[] | undefined>;
  const currentArtistSlug = unwrapSegment(params.artistSlug);

  const toggles = [
    {
      type: 'sort' as const,
      isActive: alphaAsc,
      onToggle: () => toggleFilter('alpha'),
      title: alphaAsc ? 'Z-A' : 'A-Z',
    },
  ];

  const processedArtists = useMemo(() => {
    const grouped = groupBy(artists, 'featured');
    const sortedGroups = Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));

    return sortedGroups.map(([type, groupArtists]) => {
      const sorted = [...groupArtists];
      if (alphaAsc) {
        sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      } else {
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
      return [type, sorted] as [string, Artist[]];
    });
  }, [artists, alphaAsc]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const [type, groupArtists] of processedArtists) {
      out.push({
        kind: 'header',
        key: `header-${type}`,
        label: type === '1' ? 'Featured' : 'Bands',
      });
      for (const artist of groupArtists) {
        out.push({ kind: 'artist', key: `artist-${artist.uuid}`, artist });
      }
    }
    return out;
  }, [processedArtists]);

  const totalArtistCount = artists.length;
  const filteredArtistCount = processedArtists.reduce(
    (acc, [, groupArtists]) => acc + groupArtists.length,
    0
  );

  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    estimateSize: (i) => (items[i].kind === 'header' ? HEADER_ESTIMATE : ROW_ESTIMATE),
    overscan: 8,
  });

  const renderItem = (item: Item) => {
    if (item.kind === 'header') {
      return <RowHeader>{item.label}</RowHeader>;
    }
    return (
      <Row href={`/${item.artist.slug}`} active={item.artist.slug === currentArtistSlug}>
        <div>
          <div>{item.artist.name}</div>
          <PopularityBadge popularity={item.artist.popularity} />
          {byObject[String(item.artist.slug)] && (
            <div className="text-foreground-muted text-xxs">
              Powered by {byObject[String(item.artist.slug)]}
            </div>
          )}
        </div>
        <div className="min-w-[20%] text-right text-xs">
          <div>
            <Count unit="show" value={item.artist.show_count} />
          </div>
          <div>
            <Count unit="tape" value={item.artist.source_count} />
          </div>
        </div>
      </Row>
    );
  };

  return (
    <ColumnWithToggleControls
      heading="Bands"
      toggles={toggles}
      filteredCount={filteredArtistCount}
      totalCount={totalArtistCount}
      onClearFilters={clearFilters}
      subHeader={subHeader}
      scrollContainerRef={setScrollEl}
      height={virtualizer.getTotalSize()}
    >
      <div className={cn('relative transition-opacity', { 'opacity-40': isPending })}>
        {scrollEl
          ? virtualizer.getVirtualItems().map((vi) => {
              const item = items[vi.index];
              return (
                <div
                  key={item.key}
                  data-index={vi.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  {renderItem(item)}
                </div>
              );
            })
          : items.slice(0, 30).map((item) => <div key={item.key}>{renderItem(item)}</div>)}
      </div>
    </ColumnWithToggleControls>
  );
};

export default ArtistsColumnWithControls;
