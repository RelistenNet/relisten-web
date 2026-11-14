import BrowseColumn from '@/features/browse/BrowseColumn';
import YearsColumn from '@/features/browse/YearsColumn';
import { getSegmentParams } from '@timber-js/app/server';
import { ReactNode } from 'react';
import { SEGMENT_PATH } from './$segment';

// The years column. 'document' with the default key (artistSlug): navigating
// within an artist skips it without rendering it.
export default function ArtistLayout({ children }: { children: ReactNode }) {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return (
    <>
      <BrowseColumn>
        <YearsColumn artistSlug={artistSlug} />
      </BrowseColumn>
      {children}
    </>
  );
}
