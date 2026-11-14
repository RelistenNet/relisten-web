import { ReactNode } from 'react';
import Flex from '@/ui/base/Flex';
import NavBar from '@/shell/NavBar';

// Every page with the nav: the browse view, the content pages and the embed
// test pages. Rendered once per document (layoutDefaults), so the nav renders
// once, and navigating between the groups below renders only their layouts.
// The nav reads its artist and title on the client (see browsingArtistContext).
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <Flex column className="lg:h-dvh">
      <NavBar />
      {children}
    </Flex>
  );
}
