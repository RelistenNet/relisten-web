'use client';

import cn from '@/lib/cn';
import { FilterState } from '@/lib/filterCookies';
import { Artist } from '@/types';
import { fuzzyMatch, type HighlightRanges } from '@nozbe/microfuzz';
import { X } from 'lucide-react';
import { useMemo, useRef, useState, useTransition } from 'react';
import ArtistsColumnWithControls from './ArtistsColumnWithControls';

type Tab = 'primary' | 'all';

type ArtistsSelectionTabProps = {
  artistsAll: Artist[];
};

const ArtistsSelectionTab = ({ artistsAll }: ArtistsSelectionTabProps) => {
  const [tab, setTab] = useState<Tab>('primary');
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const primaryArtists = useMemo(
    () => artistsAll.filter((artist) => Number(artist.featured) <= 1),
    [artistsAll]
  );

  const archiveArtists = useMemo(
    () => artistsAll.filter((artist) => Number(artist.featured) > 1),
    [artistsAll]
  );

  const { artists, highlightRanges } = useMemo(() => {
    const query = searchQuery.trim();
    if (query) {
      const ranges = new Map<string, HighlightRanges>();
      const scored: { artist: Artist; score: number }[] = [];
      for (const artist of artistsAll) {
        const result = fuzzyMatch(artist.name || '', query);
        if (result) {
          scored.push({ artist, score: result.score });
          const [nameRanges] = result.matches;
          if (artist.uuid && nameRanges) {
            ranges.set(artist.uuid, nameRanges);
          }
        }
      }
      scored.sort((a, b) => a.score - b.score);
      return { artists: scored.map((s) => s.artist), highlightRanges: ranges };
    }
    const list = tab === 'primary' ? primaryArtists : archiveArtists;
    return { artists: list, highlightRanges: new Map<string, HighlightRanges>() };
  }, [tab, artistsAll, primaryArtists, archiveArtists, searchQuery]);

  const TABS: { value: Tab; label: string }[] = useMemo(
    () => [
      { value: 'primary', label: `Primary Artists (${primaryArtists.length})` },
      { value: 'all', label: `Archive Artists (${archiveArtists.length})` },
    ],
    [primaryArtists.length, archiveArtists.length]
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
              className={cn('rounded-sm px-2 flex-1 py-0.5 text-xs transition-colors', {
                'bg-accent font-medium text-white': isActive,
                'text-text-muted hover:bg-surface-hover hover:text-text-primary': !isActive,
                'bg-accent/60 animation-pulse cursor-progress text-white hover:bg-accent/60 hover:text-white':
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
          className="w-full tracking-wide text-lg bg-surface px-3 py-1.5 pr-7 text-sm text-text-primary placeholder:text-text-muted focus:outline-none lg:text-xs"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
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
};

export default ArtistsSelectionTab;
