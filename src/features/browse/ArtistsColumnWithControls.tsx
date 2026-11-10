'use client';

import React, { Fragment, type RefObject, Suspense, use, useMemo, useRef, useState } from 'react';
import { browser } from 'react-dom';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { ArrowUp, ArrowDown, LoaderCircle } from 'lucide-react';
import Count from '@/ui/base/Count';
import { artistPlays, groupArtists, type ArtistListItem } from '@/lib/artistRows';
import { useFilterState } from '@/hooks/useFilterState';
import cn from '@/lib/cn';
import ColumnWithToggleControls from '@/ui/base/ColumnWithToggleControls';
import PopularityBadge from '@/ui/base/PopularityBadge';
import type { HighlightRanges } from '@nozbe/microfuzz';
import { loadArchive, searchArtists } from '@/lib/archiveArtists';
import Row from '@/ui/base/Row';
import RowHeader from '@/ui/base/RowHeader';

const byObject = {
  phish: 'Phish.in',
};

type Item =
  | { kind: 'status'; key: string; failed: boolean }
  | { kind: 'header'; key: string; label: string }
  | { kind: 'artist'; key: string; artist: ArtistListItem };

const HEADER_ESTIMATE = 28;
const ROW_ESTIMATE = 45;

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

/** Where an artist's row links, and which row is current. */
export type ArtistLinks = {
  /** The current artist: its row is marked active. */
  currentSlug: string | undefined;
  /** An artist's row link. */
  hrefFor: (artist: ArtistListItem) => string;
};

type ArtistsColumnWithControlsProps = ArtistLinks & {
  primaryArtists: ArtistListItem[];
  tab: ArtistsTab;
  searchQuery: string;
  subHeader?: React.ReactNode;
  isPending?: boolean;
  /**
   * The artist picker's popover: a fixed height, and no heading bar (the sort
   * toggles live on the browse view's column; the picker follows them).
   */
  compact?: boolean;
};

/**
 * The column frame: heading, sort toggles, sub-header and scroll container.
 * Only the list inside it waits on the archive, under its own Suspense
 * boundary, so none of the frame remounts when the archive arrives.
 */
const ArtistsColumnWithControls = ({
  primaryArtists,
  tab,
  searchQuery,
  subHeader,
  isPending,
  compact = false,
  currentSlug,
  hrefFor,
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
    currentSlug,
    hrefFor,
  };

  return (
    <ColumnWithToggleControls
      heading={compact ? undefined : 'Artists'}
      className={compact ? 'h-[min(30rem,70dvh)] flex-none' : undefined}
      toggles={toggles}
      subHeader={subHeader}
      scrollContainerRef={setScrollEl}
    >
      <Suspense fallback={<ArtistList {...listProps} archiveArtists={undefined} />}>
        <ArtistListWithArchive {...listProps} />
      </Suspense>
    </ColumnWithToggleControls>
  );
};

type ArtistListProps = ArtistLinks & {
  primaryArtists: ArtistListItem[];
  /**
   * `undefined` until the archive list has loaded (and in the server render),
   * `null` if it failed to.
   */
  archiveArtists: ArtistListItem[] | null | undefined;
  tab: ArtistsTab;
  searchQuery: string;
  sortBy: ReturnType<typeof useFilterState>['sortBy'];
  alphaAsc: boolean;
  scrollEl: HTMLDivElement | null;
  /** The latest row measurements, shared by successive lists. */
  measurements: RefObject<VirtualItem[]>;
  isPending?: boolean;
};

function ArtistListWithArchive(props: Omit<ArtistListProps, 'archiveArtists'>) {
  use(browser());
  return <ArtistList {...props} archiveArtists={use(loadArchive())} />;
}

/** The artists to show: the tab's list, or fuzzy matches across both lists while searching. */
function selectArtists(
  primaryArtists: ArtistListItem[],
  archiveArtists: ArtistListItem[] | null | undefined,
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
  const matches = searchArtists([primaryArtists, archiveArtists ?? []], query);
  const highlightRanges = new Map<string, HighlightRanges>();
  for (const { artist, result } of matches) {
    const [nameRanges] = result.matches;
    if (artist.slug && nameRanges) highlightRanges.set(artist.slug, nameRanges);
  }
  return { artists: matches.map((m) => m.artist), highlightRanges };
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
  currentSlug,
  hrefFor,
}: ArtistListProps) {
  const { artists, highlightRanges } = useMemo(
    () => selectArtists(primaryArtists, archiveArtists, tab, searchQuery),
    [primaryArtists, archiveArtists, tab, searchQuery]
  );

  const processedArtists = useMemo(() => {
    const dir = alphaAsc ? -1 : 1;

    return groupArtists(artists).map((group) => {
      const sorted = [...group.artists];
      switch (sortBy) {
        case 'popularity':
          sorted.sort((a, b) => dir * (artistPlays(b) - artistPlays(a)));
          break;
        case 'tapes':
          sorted.sort((a, b) => dir * (b.sourceCount - a.sourceCount));
          break;
        default:
          sorted.sort((a, b) => dir * (a.name || '').localeCompare(b.name || ''));
      }
      return { ...group, artists: sorted };
    });
  }, [artists, alphaAsc, sortBy]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    // The archive tab, or a search (which covers the archive), without the
    // archive: a spinner while it loads, a line if it failed.
    if (!archiveArtists && (tab === 'all' || searchQuery.trim())) {
      out.push({ kind: 'status', key: 'status', failed: archiveArtists === null });
    }
    for (const group of processedArtists) {
      out.push({ kind: 'header', key: `header-${group.key}`, label: group.label });
      for (const artist of group.artists) {
        out.push({ kind: 'artist', key: `artist-${artist.slug}`, artist });
      }
    }
    return out;
  }, [processedArtists, archiveArtists, tab, searchQuery]);

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
    estimateSize: (i) => (items[i].kind === 'artist' ? ROW_ESTIMATE : HEADER_ESTIMATE),
    getItemKey: (i) => items[i].key,
    overscan: 8,
  });

  const renderItem = (item: Item) => {
    if (item.kind === 'status') {
      return item.failed ? (
        <div className="px-3 py-2 text-xs text-foreground-muted lg:px-2">
          {"Couldn't load archive artists."}
        </div>
      ) : (
        <div
          className="flex justify-center py-3"
          role="status"
          aria-label="Loading archive artists"
        >
          <LoaderCircle className="size-4 animate-spin text-foreground-muted" />
        </div>
      );
    }
    if (item.kind === 'header') {
      return <RowHeader>{item.label}</RowHeader>;
    }
    return (
      <Row href={hrefFor(item.artist)} active={item.artist.slug === currentSlug} refreshWhenCurrent>
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
          <Count unit="show" value={item.artist.showCount} />
          <Count unit="tape" value={item.artist.sourceCount} />
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
