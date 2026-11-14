import NavBar from '@/components/NavBar';
import Flex from '@/components/Flex';
import { PropsWithChildren } from 'react';

export default function LiveLayout({ children }: PropsWithChildren) {
  return (
    <Flex column className="h-[calc(100vh-var(--preview-banner-height,0px))]">
      <NavBar />
      <div className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto w-full py-8">{children}</div>
      </div>
    </Flex>
  );
}
