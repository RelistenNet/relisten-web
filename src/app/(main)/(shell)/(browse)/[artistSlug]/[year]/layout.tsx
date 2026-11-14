import BrowseColumn from '@/features/browse/BrowseColumn';
import ShowsColumn from '@/features/browse/ShowsColumn';
import { getSegmentParams } from '@timber-js/app/server';
import { ReactNode } from 'react';
import { SEGMENT_PATH } from './$segment';

// The shows column, keyed by default on artistSlug and year.
export default function YearLayout({ children }: { children: ReactNode }) {
  const { artistSlug, year } = getSegmentParams(SEGMENT_PATH);
  return (
    <>
      <BrowseColumn>
        <ShowsColumn artistSlug={artistSlug} year={year} />
      </BrowseColumn>
      {children}
    </>
  );
}
