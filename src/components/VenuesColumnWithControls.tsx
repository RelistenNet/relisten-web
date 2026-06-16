'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Venue } from '@/types';
import Count from './Count';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';

type VenuesColumnWithControlsProps = {
  artistSlug?: string;
  venues: Venue[];
  subHeader?: ReactNode;
};

const VenuesColumnWithControls = ({ artistSlug, venues, subHeader }: VenuesColumnWithControlsProps) => {
  const [sortAlpha, setSortAlpha] = useState(false);

  const toggles = [
    {
      type: 'sort' as const,
      isActive: sortAlpha,
      onToggle: () => setSortAlpha((v) => !v),
      title: sortAlpha ? 'Most Shows' : 'A-Z',
    },
  ];

  const sortedVenues = useMemo(() => {
    const sorted = [...venues];
    if (sortAlpha) {
      sorted.sort((a, b) => (a.sortName || a.name || '').localeCompare(b.sortName || b.name || ''));
    } else {
      sorted.sort((a, b) => (b.shows_at_venue ?? 0) - (a.shows_at_venue ?? 0));
    }
    return sorted;
  }, [venues, sortAlpha]);

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
