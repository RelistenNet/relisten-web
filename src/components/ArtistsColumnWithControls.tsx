'use client';

import React, { useMemo, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSegmentParams } from '@timber-js/app/client';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { groupBy } from '../lib/utils';
import Count from './Count';
import { Artist } from '../types';
import { useFilterState } from '@/hooks/useFilterState';
import cn from '@/lib/cn';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import PopularityBadge from './PopularityBadge';
import type { HighlightRanges } from '@nozbe/microfuzz';
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
const GROUP_ORDER: Record<string, number> = { '1': 0, '0': 1 };

function HighlightText({ text, ranges }: { text: string; ranges: HighlightRanges }) {
  if (!ranges.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const [start, end] of ranges) {
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <mark key={start} className="bg-accent/30 text-inherit">
        {text.slice(start, end + 1)}
      </mark>
    );
    last = end + 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

type ArtistsColumnWithControlsProps = {
  artists: Artist[];
  highlightRanges?: Map<string, HighlightRanges>;
  subHeader?: React.ReactNode;
  isPending?: boolean;
  onClearSearch?: () => void;
};

const ArtistsColumnWithControls = ({
  artists,
  highlightRanges,
  subHeader,
  isPending,
  onClearSearch,
}: ArtistsColumnWithControlsProps) => {
  const { alphaAsc, sortBy, setSortBy, clearFilters } = useFilterState('root');
  const params = useSegmentParams() as Record<string, string | string[] | undefined>;
  const currentArtistSlug = unwrapSegment(params.artistSlug);

  const dirIcon = alphaAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  const toggles = [
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
      type: 'sort' as const,
      isActive: sortBy === 'alpha',
      onToggle: () => setSortBy('alpha'),
      title: sortBy === 'alpha' ? (alphaAsc ? 'Z-A' : 'A-Z') : 'Sort A-Z',
      label: 'A-Z',
      icon: sortBy === 'alpha' ? dirIcon : undefined,
    },
    {
      type: 'sort' as const,
      isActive: sortBy === 'tapes',
      onToggle: () => setSortBy('tapes'),
      title: sortBy === 'tapes' ? (alphaAsc ? 'Fewest tapes' : 'Most tapes') : 'Sort by tapes',
      label: 'Tapes',
      icon: sortBy === 'tapes' ? dirIcon : undefined,
    },
  ];

  const processedArtists = useMemo(() => {
    const grouped = groupBy(artists, 'featured');
    const sortedGroups = Object.entries(grouped).sort(
      ([a], [b]) => (GROUP_ORDER[a] ?? 2) - (GROUP_ORDER[b] ?? 2)
    );

    const dir = alphaAsc ? -1 : 1;

    return sortedGroups.map(([type, groupArtists]) => {
      const sorted = [...groupArtists];
      switch (sortBy) {
        case 'popularity':
          sorted.sort((a, b) => {
            const ap = a.popularity?.windows?.['30d']?.plays ?? 0;
            const bp = b.popularity?.windows?.['30d']?.plays ?? 0;
            return dir * (bp - ap);
          });
          break;
        case 'tapes':
          sorted.sort((a, b) => dir * ((b.source_count ?? 0) - (a.source_count ?? 0)));
          break;
        default:
          sorted.sort((a, b) => dir * (a.name || '').localeCompare(b.name || ''));
      }
      return [type, sorted] as [string, Artist[]];
    });
  }, [artists, alphaAsc, sortBy]);

  const groupLabel = (type: string) => {
    switch (type) {
      case '1':
        return 'Featured Artists';
      case '0':
        return 'Primary Artists';
      default:
        return 'Archive Artists';
    }
  };

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const [type, groupArtists] of processedArtists) {
      if (groupArtists.length === 0) continue;
      out.push({
        kind: 'header',
        key: `header-${type}`,
        label: groupLabel(type),
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

  const handleClearFilters = () => {
    clearFilters();
    onClearSearch?.();
  };

  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    estimateSize: (i) => (items[i].kind === 'header' ? HEADER_ESTIMATE : ROW_ESTIMATE),
    getItemKey: (i) => items[i].key,
    overscan: 8,
  });

  const renderItem = (item: Item) => {
    if (item.kind === 'header') {
      return <RowHeader>{item.label}</RowHeader>;
    }
    return (
      <Row href={`/${item.artist.slug}`} active={item.artist.slug === currentArtistSlug}>
        <div>
          <div>
            {item.artist.uuid && highlightRanges?.has(item.artist.uuid) ? (
              <HighlightText
                text={item.artist.name || ''}
                ranges={highlightRanges.get(item.artist.uuid)!}
              />
            ) : (
              item.artist.name
            )}
          </div>
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
      onClearFilters={handleClearFilters}
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
