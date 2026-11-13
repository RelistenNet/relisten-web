import ArtistsColumn from '@/features/browse/ArtistsColumn';
import BrowseColumn from '@/features/browse/BrowseColumn';
import BrowseContainer from '@/features/browse/BrowseContainer';
import Flex from '@/ui/base/Flex';
import { ReactNode } from 'react';
import MobileBrowseNav from '@/features/browse/MobileBrowseNav';
import NavBar from '@/shell/NavBar';

// Rendered once per document (layoutDefaults), with the artists column, which
// depends on no request input. Each deeper browse layout renders its own
// column, keyed by default on the params on its path. The nav reads its
// artist on the client (see browsingArtistContext).
export default function BrowseLayout({ children }: { children: ReactNode }) {
  return (
    <Flex column className="lg:h-dvh">
      <NavBar />
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
