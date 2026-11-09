'use client';

import cn from '@/lib/cn';
import { fromArtistRow, type ArtistRow } from '@/lib/artistRows';
import { loadArchive } from '@/lib/archiveArtists';
import { useSegmentParams } from '@timber-js/app/client';
import { X } from 'lucide-react';
import { Suspense, use, useMemo, useRef, useState, useTransition } from 'react';
import { browser } from 'react-dom';
import ArtistsColumnWithControls, { type ArtistsTab } from './ArtistsColumnWithControls';

type ArtistsSelectionTabProps = {
  /** Primary (featured ≤ 1) artists, sent with the page shell. */
  primary: ArtistRow[];
};

/**
 * The archive list is fetched and rendered in the browser only. The two
 * things that need it, the artist list and the archive tab's count, each read
 * it under their own Suspense boundary, whose fallback (what the server
 * renders) uses the primary artists alone. Everything interactive (the tabs,
 * the search input, the sort toggles and the scroll container) sits outside
 * those boundaries, so the archive arriving never remounts it: focus, caret
 * and scroll position are kept.
 */
const ArtistsSelectionTab = ({ primary }: ArtistsSelectionTabProps) => {
  const primaryArtists = useMemo(() => primary.map(fromArtistRow), [primary]);
  const { artistSlug } = useSegmentParams('/(browse)/[artistSlug]');

  // An artist that isn't primary is an archive artist (or doesn't exist, in
  // which case the tab doesn't matter), so this needs only the primary list.
  const isArchiveSlug = (slug: string | undefined) =>
    !!slug && !primaryArtists.some((a) => a.slug === slug);

  const [tab, setTab] = useState<ArtistsTab>(() => (isArchiveSlug(artistSlug) ? 'all' : 'primary'));
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Switch to the "all" tab when navigating to an archive artist.
  const [syncedArtistSlug, setSyncedArtistSlug] = useState(artistSlug);
  if (artistSlug !== syncedArtistSlug) {
    setSyncedArtistSlug(artistSlug);
    if (isArchiveSlug(artistSlug)) setTab('all');
  }

  const tabs: { value: ArtistsTab; label: React.ReactNode }[] = [
    { value: 'primary', label: `Primary Artists (${primaryArtists.length})` },
    {
      value: 'all',
      label: (
        <>
          Archive Artists (
          <Suspense fallback="…">
            <ArchiveCount />
          </Suspense>
          )
        </>
      ),
    },
  ];

  const subHeader = (
    <>
      <div className="flex flex-wrap justify-center gap-1.5 border-b border-hairline bg-surface-raised px-2 py-1.5">
        {tabs.map(({ value, label }) => {
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
      primaryArtists={primaryArtists}
      tab={tab}
      searchQuery={searchQuery}
      subHeader={subHeader}
      isPending={isPending}
    />
  );
};

function ArchiveCount() {
  use(browser());
  return use(loadArchive())?.length ?? '…';
}

export default ArtistsSelectionTab;
