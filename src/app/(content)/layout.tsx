import Flex from '@/ui/base/Flex';
import { ReactNode } from 'react';

// Rendered once per document (layoutDefaults). The nav depends on the artist
// and the user agent, so it is the @nav slot, with a key of its own.
export default function PagesLayout({ children, nav }: { children: ReactNode; nav: ReactNode }) {
  return (
    <Flex column className="lg:h-dvh">
      {nav}
      <div className="flex-1 px-4 pt-2 lg:overflow-y-auto">
        <div
          className="
          mx-auto my-8 max-w-2xl has-[.blog-post]:max-w-xl has-[.detail-page]:my-6
          has-[.detail-page]:max-w-5xl has-[.live-page]:max-w-5xl
        "
        >
          {children}
        </div>
      </div>
    </Flex>
  );
}
