'use client';

import cn from '@/lib/cn';
import { FilterState } from '@/lib/filterCookies';
import { Artist } from '@/types';
import { useState, useTransition } from 'react';
import ArtistsColumnWithControls from './ArtistsColumnWithControls';

type Tab = 'primary' | 'all';

type ArtistsSelectionTabProps = {
  artistsPrimary: Artist[];
  artistsAll: Artist[];
  initialFilters?: FilterState;
};

const TABS: { value: Tab; label: string }[] = [
  { value: 'primary', label: 'Primary Bands' },
  { value: 'all', label: 'All Bands' },
];

const ArtistsSelectionTab = ({
  artistsPrimary,
  artistsAll,
  initialFilters,
}: ArtistsSelectionTabProps) => {
  const [tab, setTab] = useState<Tab>('primary');
  const [isPending, startTransition] = useTransition();

  const artists = tab === 'primary' ? artistsPrimary : artistsAll;

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
            className={cn('rounded-sm px-2 py-0.5 text-sm transition-colors', {
              'bg-accent font-medium text-white': isActive,
              'text-text-muted hover:bg-surface-hover hover:text-text-primary': !isActive,
              'bg-accent/60 animation-pulse cursor-progress text-white hover:bg-accent/60 hover:text-white': isButtonPending,
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
