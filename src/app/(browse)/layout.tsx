import ArtistsColumn from '@/features/browse/ArtistsColumn';
import BrowseColumn from '@/features/browse/BrowseColumn';
import BrowseContainer from '@/features/browse/BrowseContainer';
import Flex from '@/ui/base/Flex';
import { ReactNode } from 'react';
import MobileBrowseNav from '@/features/browse/MobileBrowseNav';

// Rendered once per document (layoutDefaults), with the artists column, which
// depends on no request input. Each deeper browse layout renders its own
// column, keyed by default on the params on its path. The nav depends on the
// artist and the user agent, so it is the @nav slot, with a key of its own.
export default function BrowseLayout({ children, nav }: { children: ReactNode; nav: ReactNode }) {
  return (
    <Flex column className="lg:h-dvh">
      {nav}
      <MobileBrowseNav />
      <BrowseContainer>
        <BrowseColumn>
          <ArtistsColumn />
        </BrowseColumn>
        {children}
      </BrowseContainer>
    </Flex>
  );
}
