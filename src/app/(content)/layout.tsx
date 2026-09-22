import NavBar from '@/components/NavBar';
import Flex from '@/components/Flex';
import { PropsWithChildren } from 'react';

export default function PagesLayout({ children }: PropsWithChildren) {
  return (
    <Flex column className="lg:h-dvh">
      <NavBar />
      <div className="flex-1 px-4 pt-2 lg:overflow-y-auto">
        <div className="mx-auto max-w-2xl pb-8 has-[.blog-post]:max-w-3xl">{children}</div>
      </div>
    </Flex>
  );
}
