'use client';

import cn from '@/lib/cn';
import { fromArtistRow, type ArtistListItem, type ArtistRow } from '@/lib/artistRows';
import { fuzzyMatch, type HighlightRanges } from '@nozbe/microfuzz';
import { useSegmentParams } from '@timber-js/app/client';
import { X } from 'lucide-react';
import { Suspense, use, useMemo, useRef, useState, useTransition } from 'react';
import { browser } from 'react-dom';
import ArtistsColumnWithControls from './ArtistsColumnWithControls';

type Tab = 'primary' | 'all';

type ArtistsSelectionTabProps = {
  /** Primary (featured ≤ 1) artists, sent with the page shell. */
  primary: ArtistRow[];
};

/**
 * A loader for the archive list: fetches on the first call and returns that
 * same request afterwards. Resolves to `null` on failure instead of
 * rejecting, since `use()` would throw a rejection to the error boundary.
 */
function createArchiveLoader() {
  let request: Promise<ArtistListItem[] | null> | undefined;
  return () =>
    (request ??= fetch('/api/artists/archive')
      .then((res) => (res.ok ? (res.json() as Promise<ArtistRow[]>) : null))
      .then((rows) => rows && rows.map(fromArtistRow))
      .catch(() => null));
}

/** Tab and search state, owned above the Suspense boundary so it survives the swap. */
type TabsState = {
  tab: Tab;
  setTab: (tab: Tab) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

const ArtistsSelectionTab = ({ primary }: ArtistsSelectionTabProps) => {
  const primaryArtists = useMemo(() => primary.map(fromArtistRow), [primary]);
  const { artistSlug } = useSegmentParams('/(browse)/[artistSlug]');

  // The loader lives here, not in the suspending child: a component that
  // suspends on mount loses its state, which would start a new request on
  // every retry.
  const [loadArchive] = useState(createArchiveLoader);

  // An artist that isn't primary is an archive artist (or doesn't exist, in
  // which case the tab doesn't matter), so this needs only the primary list.
  const isArchiveSlug = (slug: string | undefined) =>
    !!slug && !primaryArtists.some((a) => a.slug === slug);

  const [tab, setTab] = useState<Tab>(() => (isArchiveSlug(artistSlug) ? 'all' : 'primary'));
  const [searchQuery, setSearchQuery] = useState('');

  // Switch to the "all" tab when navigating to an archive artist.
  const [syncedArtistSlug, setSyncedArtistSlug] = useState(artistSlug);
  if (artistSlug !== syncedArtistSlug) {
    setSyncedArtistSlug(artistSlug);
    if (isArchiveSlug(artistSlug)) setTab('all');
  }

  const state: TabsState = { tab, setTab, searchQuery, setSearchQuery };

  // The server renders the primary list only (the fallback); the archive is
  // fetched and rendered in the browser.
  return (
    <Suspense
      fallback={<ArtistsTabs primaryArtists={primaryArtists} archiveArtists={null} {...state} />}
    >
      <ArtistsTabsWithArchive
        primaryArtists={primaryArtists}
        loadArchive={loadArchive}
        {...state}
      />
    </Suspense>
  );
};

function ArtistsTabsWithArchive({
  loadArchive,
  ...props
}: Omit<ArtistsTabsProps, 'archiveArtists'> & {
  loadArchive: () => Promise<ArtistListItem[] | null>;
}) {
  use(browser());
  return <ArtistsTabs {...props} archiveArtists={use(loadArchive())} />;
}

type ArtistsTabsProps = TabsState & {
  primaryArtists: ArtistListItem[];
  /** `null` until the archive list has loaded. */
  archiveArtists: ArtistListItem[] | null;
};

function ArtistsTabs({
  primaryArtists,
  archiveArtists,
  tab,
  setTab,
  searchQuery,
  setSearchQuery,
}: ArtistsTabsProps) {
  const [isPending, startTransition] = useTransition();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { artists, highlightRanges } = useMemo(() => {
    const query = searchQuery.trim();
    if (query) {
      const ranges = new Map<string, HighlightRanges>();
      const scored: { artist: ArtistListItem; score: number }[] = [];
      for (const list of [primaryArtists, archiveArtists ?? []]) {
        for (const artist of list) {
          const result = fuzzyMatch(artist.name || '', query);
          if (result) {
            scored.push({ artist, score: result.score });
            const [nameRanges] = result.matches;
            if (artist.slug && nameRanges) {
              ranges.set(artist.slug, nameRanges);
            }
          }
        }
      }
      scored.sort((a, b) => a.score - b.score);
      return { artists: scored.map((s) => s.artist), highlightRanges: ranges };
    }
    const list = tab === 'primary' ? primaryArtists : (archiveArtists ?? []);
    return { artists: list, highlightRanges: new Map<string, HighlightRanges>() };
  }, [tab, primaryArtists, archiveArtists, searchQuery]);

  const TABS: { value: Tab; label: string }[] = useMemo(
    () => [
      { value: 'primary', label: `Primary Artists (${primaryArtists.length})` },
      {
        value: 'all',
        label: `Archive Artists (${archiveArtists ? archiveArtists.length : '…'})`,
      },
    ],
    [primaryArtists.length, archiveArtists]
  );

  const subHeader = (
    <>
      <div className="flex flex-wrap justify-center gap-1.5 border-b border-hairline bg-surface-raised px-2 py-1.5">
        {TABS.map(({ value, label }) => {
          const isActive = tab === value;
          const isButtonPending = isPending && !isActive;

          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (value === tab) return;
                startTransition(() => setTab(value));
              }}
              className={cn('flex-1 rounded-sm px-2 py-0.5 text-xs transition-colors', {
                'bg-accent font-medium text-white': isActive,
                'text-text-muted hover:bg-surface-hover hover:text-text-primary': !isActive,
                'animation-pulse cursor-progress bg-accent/60 text-white hover:bg-accent/60 hover:text-white':
                  isButtonPending,
              })}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="relative border-b border-hairline">
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter artists…"
          className="
            w-full bg-surface px-3 py-1.5 pr-7 text-sm tracking-wide text-text-primary
            placeholder:text-text-muted focus:outline-none lg:text-xs
          "
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </>
  );

  return (
    <ArtistsColumnWithControls
      artists={artists}
      highlightRanges={highlightRanges}
      subHeader={subHeader}
      isPending={isPending}
      onClearSearch={() => setSearchQuery('')}
    />
  );
}

export default ArtistsSelectionTab;
