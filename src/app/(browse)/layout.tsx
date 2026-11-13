import BrowseContainer from '@/features/browse/BrowseContainer';
import Flex from '@/ui/base/Flex';
import { ReactNode } from 'react';
import MobileBrowseNav from '@/features/browse/MobileBrowseNav';
import type { LayoutOptions } from '@timber-js/app/server';

// Rendered once per document. The nav that depends on the artist and the
// user agent is the @nav slot, a 'document' segment with a key of its own.
export const layoutOptions = { lifetime: 'document' } satisfies LayoutOptions;

export default function BrowseLayout({
  children,
  nav,
  artists,
  years,
  shows,
  songs,
  sources,
}: {
  children: ReactNode;
  nav: ReactNode;
  artists: ReactNode;
  years: ReactNode;
  shows: ReactNode;
  songs: ReactNode;
  sources: ReactNode;
}) {
  return (
    <Flex column className="lg:h-dvh">
      {nav}
      <MobileBrowseNav />
      <BrowseContainer>
        <div className="browse-col">{artists}</div>
        <div className="browse-col">{years}</div>
        <div className="browse-col">{shows}</div>
        <div className="browse-col">{songs}</div>
        <div className="browse-col">{sources}</div>
        <div className="browse-col">{children}</div>
      </BrowseContainer>
    </Flex>
  );
}
