import NavBar from '@/shell/NavBar';
import Flex from '@/ui/base/Flex';
import { PropsWithChildren } from 'react';

export default function PagesLayout({ children }: PropsWithChildren) {
  return (
    <Flex column className="lg:h-dvh">
      <NavBar />
      <div className="flex-1 px-4 pt-2 lg:overflow-y-auto">
        <div className="mx-auto my-8 max-w-2xl has-[.blog-post]:max-w-xl has-[.live-page]:max-w-5xl has-[.detail-page]:my-6 has-[.detail-page]:max-w-5xl">
          {children}
        </div>
      </div>
    </Flex>
  );
}
