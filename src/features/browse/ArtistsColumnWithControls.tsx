'use client';

import React, { Fragment, type RefObject, Suspense, use, useMemo, useRef, useState } from 'react';
import { browser } from 'react-dom';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { useSegmentParams } from '@timber-js/app/client';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { groupBy } from '@/lib/utils';
import Count from '@/components/Count';
import type { ArtistListItem } from '@/lib/artistRows';
import { useFilterState } from '@/hooks/useFilterState';
import cn from '@/lib/cn';
import ColumnWithToggleControls from '@/components/ColumnWithToggleControls';
import PopularityBadge from '@/components/PopularityBadge';
import { fuzzyMatch, type HighlightRanges } from '@nozbe/microfuzz';
import Row, { unwrapSegment } from '@/components/Row';
import RowHeader from '@/components/RowHeader';

const byObject = {
  phish: 'Phish.in',
};

type Item =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'artist'; key: string; artist: ArtistListItem };

const HEADER_ESTIMATE = 28;
const ROW_ESTIMATE = 45;
const GROUP_ORDER: Record<string, number> = { '1': 0, '0': 1 };

function HighlightText({ text, ranges }: { text: string; ranges: HighlightRanges }) {
  if (!ranges.length) return text;
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
  return parts;
}

export type ArtistsTab = 'primary' | 'all';

/** Returns the archive list (`null` if it failed to load); the same promise on every call. */
export type ArchiveLoader = () => Promise<ArtistListItem[] | null>;

type ArtistsColumnWithControlsProps = {
  primaryArtists: ArtistListItem[];
  loadArchive: ArchiveLoader;
  tab: ArtistsTab;
  searchQuery: string;
  subHeader?: React.ReactNode;
  isPending?: boolean;
};

/**
 * The column frame: heading, sort toggles, sub-header and scroll container.
 * Only the list inside it waits on the archive, under its own Suspense
 * boundary, so none of the frame remounts when the archive arrives.
 */
const ArtistsColumnWithControls = ({
  primaryArtists,
  loadArchive,
  tab,
  searchQuery,
  subHeader,
  isPending,
}: ArtistsColumnWithControlsProps) => {
  const { alphaAsc, sortBy, setSortBy } = useFilterState('root');
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  // Row measurements, kept here so the list that replaces the fallback when
  // the archive arrives lays out exactly like the one it replaces.
  const measurements = useRef<VirtualItem[]>([]);

  const dirIcon = alphaAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  const toggles = [
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

  const listProps = {
    primaryArtists,
    tab,
    searchQuery,
    sortBy,
    alphaAsc,
    scrollEl,
    measurements,
    isPending,
  };

  return (
    <ColumnWithToggleControls
      heading="Artists"
      toggles={toggles}
      subHeader={subHeader}
      scrollContainerRef={setScrollEl}
    >
      <Suspense fallback={<ArtistList {...listProps} archiveArtists={null} />}>
        <ArtistListWithArchive {...listProps} loadArchive={loadArchive} />
      </Suspense>
    </ColumnWithToggleControls>
  );
};

type ArtistListProps = {
  primaryArtists: ArtistListItem[];
  /** `null` until the archive list has loaded (and in the server render). */
  archiveArtists: ArtistListItem[] | null;
  tab: ArtistsTab;
  searchQuery: string;
  sortBy: ReturnType<typeof useFilterState>['sortBy'];
  alphaAsc: boolean;
  scrollEl: HTMLDivElement | null;
  /** The latest row measurements, shared by successive lists. */
  measurements: RefObject<VirtualItem[]>;
  isPending?: boolean;
};

function ArtistListWithArchive({
  loadArchive,
  ...props
}: Omit<ArtistListProps, 'archiveArtists'> & { loadArchive: ArchiveLoader }) {
  use(browser());
  return <ArtistList {...props} archiveArtists={use(loadArchive())} />;
}

/** The artists to show: the tab's list, or fuzzy matches across both lists while searching. */
function selectArtists(
  primaryArtists: ArtistListItem[],
  archiveArtists: ArtistListItem[] | null,
  tab: ArtistsTab,
  searchQuery: string
) {
  const query = searchQuery.trim();
  if (!query) {
    return {
      artists: tab === 'primary' ? primaryArtists : (archiveArtists ?? []),
      highlightRanges: new Map<string, HighlightRanges>(),
    };
  }
  const highlightRanges = new Map<string, HighlightRanges>();
  const scored: { artist: ArtistListItem; score: number }[] = [];
  for (const list of [primaryArtists, archiveArtists ?? []]) {
    for (const artist of list) {
      const result = fuzzyMatch(artist.name || '', query);
      if (result) {
        scored.push({ artist, score: result.score });
        const [nameRanges] = result.matches;
        if (artist.slug && nameRanges) highlightRanges.set(artist.slug, nameRanges);
      }
    }
  }
  scored.sort((a, b) => a.score - b.score);
  return { artists: scored.map((s) => s.artist), highlightRanges };
}

function ArtistList({
  primaryArtists,
  archiveArtists,
  tab,
  searchQuery,
  sortBy,
  alphaAsc,
  scrollEl,
  measurements,
  isPending,
}: ArtistListProps) {
  const params = useSegmentParams() as Record<string, string | string[] | undefined>;
  const currentArtistSlug = unwrapSegment(params.artistSlug);

  const { artists, highlightRanges } = useMemo(
    () => selectArtists(primaryArtists, archiveArtists, tab, searchQuery),
    [primaryArtists, archiveArtists, tab, searchQuery]
  );

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
      return [type, sorted] as [string, ArtistListItem[]];
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
        out.push({ kind: 'artist', key: `artist-${artist.slug}`, artist });
      }
    }
    return out;
  }, [processedArtists]);

  // TanStack Virtual returns mutable, unmemoizable values; the React Compiler knows and skips them.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollEl,
    // This list remounts when the archive arrives, but the scroll container
    // doesn't: start from the container's offset (a virtualizer scrolls to
    // `initialOffset` when it attaches) and from the rows already measured.
    initialOffset: () => scrollEl?.scrollTop ?? 0,
    initialMeasurementsCache: measurements.current,
    onChange: (instance) => {
      measurements.current = instance.measurementsCache;
    },
    estimateSize: (i) => (items[i].kind === 'header' ? HEADER_ESTIMATE : ROW_ESTIMATE),
    getItemKey: (i) => items[i].key,
    overscan: 8,
  });

  const renderItem = (item: Item) => {
    if (item.kind === 'header') {
      return <RowHeader>{item.label}</RowHeader>;
    }
    return (
      <Row
        href={`/${item.artist.slug}`}
        active={item.artist.slug === currentArtistSlug}
        refreshWhenCurrent
      >
        <div>
          <div>
            {item.artist.slug && highlightRanges?.has(item.artist.slug) ? (
              <HighlightText
                text={item.artist.name || ''}
                ranges={highlightRanges.get(item.artist.slug) ?? []}
              />
            ) : (
              item.artist.name
            )}
          </div>
          <PopularityBadge popularity={item.artist.popularity} />
          {byObject[String(item.artist.slug)] && (
            <div className="text-xxs text-foreground-muted">
              Powered by {byObject[String(item.artist.slug)]}
            </div>
          )}
        </div>
        <div className="min-w-[20%] text-right text-xs">
          <Count unit="show" value={item.artist.show_count} />
          <Count unit="tape" value={item.artist.source_count} />
        </div>
      </Row>
    );
  };

  return (
    <div
      className={cn('relative transition-opacity', { 'opacity-40': isPending })}
      style={{ minHeight: virtualizer.getTotalSize() }}
    >
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
                  // `top`, not translateY: Firefox ignores ancestor transforms when
                  // resolving CSS anchor positions, so tooltips in rows land offset.
                  top: vi.start,
                  left: 0,
                  right: 0,
                }}
              >
                {renderItem(item)}
              </div>
            );
          })
        : items.slice(0, 30).map((item) => <Fragment key={item.key}>{renderItem(item)}</Fragment>)}
    </div>
  );
}

export default ArtistsColumnWithControls;
