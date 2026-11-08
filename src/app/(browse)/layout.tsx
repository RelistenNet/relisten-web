import BrowseContainer from '@/features/browse/BrowseContainer';
import Flex from '@/ui/base/Flex';
import NavBar from '@/shell/NavBar';
import { ReactNode } from 'react';
import { Toaster } from 'sonner';
import MobileBrowseNav from '@/features/browse/MobileBrowseNav';

export default function BrowseLayout({
  children,
  artists,
  years,
  shows,
  songs,
  sources,
}: {
  children: ReactNode;
  artists: ReactNode;
  years: ReactNode;
  shows: ReactNode;
  songs: ReactNode;
  sources: ReactNode;
}) {
  return (
    <Flex column className="lg:h-dvh">
      <Toaster id="audio-error" position="top-center" offset="54px" richColors closeButton />
      <NavBar browse />
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
