'use client';

import { useMemo, useState } from 'react';
import { Venue } from '@/types';
import { simplePluralize } from '@/lib/utils';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import Row from './Row';

type VenuesColumnWithControlsProps = {
  artistSlug?: string;
  venues: Venue[];
};

const VenuesColumnWithControls = ({ artistSlug, venues }: VenuesColumnWithControlsProps) => {
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
    >
      {sortedVenues.length === 0 && (
        <div className="py-2 text-center text-sm text-gray-700">No venues found.</div>
      )}
      {artistSlug &&
        sortedVenues.map((venue) => (
          <div key={venue.id}>
            <Row href={slugSearchParams.buildUrl(`/${artistSlug}/venues`, { slug: venue.slug || String(venue.id) })}>
              <div>
                <div>{venue.name}</div>
                {venue.location && (
                  <div className="text-xxs text-foreground-muted">{venue.location}</div>
                )}
              </div>
              <div className="text-xxs text-foreground-muted min-w-[20%] text-right">
                {venue.shows_at_venue != null && (
                  <div>{simplePluralize('show', venue.shows_at_venue)}</div>
                )}
              </div>
            </Row>
          </div>
        ))}
    </ColumnWithToggleControls>
  );
};

export default VenuesColumnWithControls;
