import { ReactNode } from 'react';
import Flex from '@/ui/base/Flex';
import NavBar from '@/shell/NavBar';

// Rendered once per document (layoutDefaults): the nav reads its artist and
// title on the client (see browsingArtistContext).
export default function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <Flex column className="lg:h-dvh">
      <NavBar />
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
