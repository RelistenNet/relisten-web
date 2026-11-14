import ArtistsColumn from '@/features/browse/ArtistsColumn';
import BrowseColumn from '@/features/browse/BrowseColumn';
import BrowseContainer from '@/features/browse/BrowseContainer';
import { ReactNode } from 'react';
import MobileBrowseNav from '@/features/browse/MobileBrowseNav';

// Under the nav ((main)/layout.tsx). Rendered once per document
// (layoutDefaults), with the artists column, which depends on no request
// input. Each deeper browse layout renders its own column, keyed by default on
// the params on its path.
export default function BrowseLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MobileBrowseNav />
      <BrowseContainer>
        <BrowseColumn>
          <ArtistsColumn />
        </BrowseColumn>
        {children}
      </BrowseContainer>
    </>
  );
}
