import NavBar from '@/components/NavBar';
import Flex from '@/components/Flex';
import { PropsWithChildren } from 'react';

export default function PagesLayout({ children }: PropsWithChildren) {
  return (
    <Flex column className="lg:h-[calc(100dvh-var(--preview-banner-height,0px))]">
      <NavBar />
      <div className="flex-1 px-4 pt-2 lg:overflow-y-auto">
        <div className="mx-auto my-8 max-w-2xl has-[.blog-post]:max-w-xl has-[.live-page]:max-w-5xl">
          {children}
        </div>
      </div>
    </Flex>
  );
}
