'use client';

import cn from '@/lib/cn';
import { FilterState } from '@/lib/filterCookies';
import { Artist } from '@/types';
import { useMemo, useState, useTransition } from 'react';
import ArtistsColumnWithControls from './ArtistsColumnWithControls';

type Tab = 'primary' | 'all';

type ArtistsSelectionTabProps = {
  artistsAll: Artist[];
  initialFilters?: FilterState;
};

const ArtistsSelectionTab = ({ artistsAll, initialFilters }: ArtistsSelectionTabProps) => {
  const [tab, setTab] = useState<Tab>('primary');
  const [isPending, startTransition] = useTransition();

  const primaryArtists = useMemo(
    () => artistsAll.filter((artist) => Number(artist.featured) <= 1),
    [artistsAll]
  );
  const artists = tab === 'primary' ? primaryArtists : artistsAll;

  const TABS: { value: Tab; label: string }[] = useMemo(
    () => [
      { value: 'primary', label: `Primary Artists (${primaryArtists.length})` },
      { value: 'all', label: `All Artists (${artistsAll.length})` },
    ],
    [primaryArtists.length, artistsAll.length]
  );

  const tabBar = (
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
  );

  return (
    <ArtistsColumnWithControls
      artists={artists}
      initialFilters={initialFilters}
      subHeader={tabBar}
      isPending={isPending}
    />
  );
};

export default ArtistsSelectionTab;
