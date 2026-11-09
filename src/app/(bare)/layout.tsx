import NavBar from '@/shell/NavBar';
import PrimaryArtists from '@/shell/PrimaryArtists';
import Flex from '@/ui/base/Flex';
import { PropsWithChildren } from 'react';

export default function LiveLayout({ children }: PropsWithChildren) {
  return (
    <PrimaryArtists>
      <Flex column className="h-screen">
        <NavBar />
        <div className="flex-1 overflow-y-auto px-4">
          <div className="mx-auto w-full py-8">{children}</div>
        </div>
      </Flex>
    </PrimaryArtists>
  );
}
