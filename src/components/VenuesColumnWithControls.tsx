'use client';

import { PropsWithChildren } from 'react';
import { FilterState } from '@/lib/filterCookies';
import ColumnWithToggleControls from './ColumnWithToggleControls';
import { Venue } from '@/types';
import Row from './Row';
import { simplePluralize } from '../lib/utils';

type VenuesColumnWithControlsProps = {
  artistSlug?: string;
  artistName?: string;
  artistVenues?: Venue[];
  initialFilters?: FilterState;
} & PropsWithChildren;

const VenuesColumnWithControls = ({
  artistSlug,
  artistName,
  artistVenues,
  children,
}: VenuesColumnWithControlsProps) => {
  return (
    <ColumnWithToggleControls
      heading={artistName ?? 'Venues'}
      filteredCount={artistVenues?.length}
      totalCount={artistVenues?.length}
      showDisplayToggle
      artistSlug={artistSlug}
    >
      {children}
      {artistSlug &&
        artistVenues &&
        artistVenues.length > 0 &&
        artistVenues.map((venueObj) => (
          <Row
            key={venueObj.id}
            href={`/${artistSlug}/venues/${venueObj.id}`}
            activeSegments={{ year: venueObj.name }}
          >
            <div className="flex items-center gap-1">
              <div>{venueObj.name}</div>
            </div>
            <div className="text-xxs text-foreground-muted min-w-[20%] pr-1 text-right">
              <div>{simplePluralize('show', venueObj.shows_at_venue)}</div>
            </div>
          </Row>
        ))}
    </ColumnWithToggleControls>
  );
};

export default VenuesColumnWithControls;
