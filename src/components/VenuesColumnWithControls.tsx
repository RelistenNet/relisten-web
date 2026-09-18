'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Venue } from '@/types';
import Count from './Count';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';
import { useFilterState } from '@/hooks/useFilterState';
import { ArrowUp, ArrowDown } from 'lucide-react';

type VenuesColumnWithControlsProps = {
  artistSlug?: string;
  venues: Venue[];
  subHeader?: ReactNode;
};

const VenuesColumnWithControls = ({
  artistSlug,
  venues,
  subHeader,
}: VenuesColumnWithControlsProps) => {
  const { alphaAsc, sortBy, setSortBy } = useFilterState(`${artistSlug}:venues`, 'alpha')
  const [{ slug: activeSlug }] = slugSearchParams.useQueryStates();

  const dirIcon = alphaAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  const toggles = [
    {
      type: 'sort' as const,
      isActive: sortBy === 'alpha',
      isDefault: sortBy === 'alpha' && !alphaAsc,
      onToggle: () => setSortBy('alpha'),
      title: sortBy === 'alpha' ? (alphaAsc ? 'Z-A' : 'A-Z') : 'Sort A-Z',
      label: 'A-Z',
      icon: sortBy === 'alpha' ? dirIcon : undefined
    },
    {
      type: 'sort' as const,
      isActive: sortBy === 'tapes',
      onToggle: () => setSortBy('tapes'),
      title: sortBy === 'tapes' ? (alphaAsc ? 'Least Shows' : 'Most Shows') : 'Sort by shows',
      label: 'Shows',
      icon: sortBy === 'tapes' ? dirIcon : undefined
    },
  ];

  const sortedVenues = useMemo(() => {
    const sorted = [...venues];
    if (sortBy === 'alpha') {
      sorted.sort((a, b) => {
        return (a.sortName?.trim() || a.name || '').localeCompare(b.sortName?.trim() || b.name || '')
    });
    } else {
      sorted.sort((a, b) => (b.shows_at_venue ?? 0) - (a.shows_at_venue ?? 0));
    }
    if (alphaAsc) sorted.reverse();
    return sorted;
  }, [venues, sortBy, alphaAsc]);

  return (
    <ColumnWithToggleControls
      heading="Venues"
      toggles={toggles}
      filteredCount={sortedVenues.length}
      totalCount={venues.length}
      subHeader={subHeader}
    >
      {sortedVenues.length === 0 && (
        <div className="py-2 text-center text-sm text-text-muted">No venues found.</div>
      )}
      {artistSlug &&
        sortedVenues.map((venue) => (
          <div key={venue.id}>
            <Row
              href={slugSearchParams.href(`/${artistSlug}/venues`, {
                slug: venue.slug || String(venue.id),
              })}
              active={activeSlug === (venue.slug || String(venue.id))}
            >
              <div>
                <div>{venue.name}</div>
                {venue.location && (
                  <div className="text-xxs text-foreground-muted">{venue.location}</div>
                )}
              </div>
              <div className="text-xxs min-w-[20%] text-right">
                {venue.shows_at_venue != null && (
                  <div>
                    <Count unit="show" value={venue.shows_at_venue} />
                  </div>
                )}
              </div>
            </Row>
          </div>
        ))}
    </ColumnWithToggleControls>
  );
};

export default VenuesColumnWithControls;
