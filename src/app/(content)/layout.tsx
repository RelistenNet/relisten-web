import NavBar from '@/components/NavBar';
import Flex from '@/components/Flex';
import { PropsWithChildren } from 'react';

export default function PagesLayout({ children }: PropsWithChildren) {
  return (
    <Flex column className="h-screen">
      <NavBar />
      <div className="flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-2xl py-8">{children}</div>
      </div>
    </Flex>
  );
}
