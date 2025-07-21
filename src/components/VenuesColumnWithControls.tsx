'use client';

import { PropsWithChildren } from 'react';
import { FilterState } from '@/lib/filterCookies';
import ColumnWithToggleControls from './ColumnWithToggleControls';

type VenuesColumnWithControlsProps = {
  artistSlug?: string;
  artistName?: string;
  initialFilters?: FilterState;
} & PropsWithChildren;

const VenuesColumnWithControls = ({
  artistSlug,
  artistName,
  children,
}: VenuesColumnWithControlsProps) => {
  return (
    <ColumnWithToggleControls
      heading={artistName ?? 'Venues'}
      filteredCount={0}
      totalCount={0}
      showDisplayToggle
      artistSlug={artistSlug}
    >
      {children}
    </ColumnWithToggleControls>
  );
};

export default VenuesColumnWithControls;
