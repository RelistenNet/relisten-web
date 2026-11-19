import { ReactNode } from 'react';
import type { LayoutOptions } from '@timber-js/app/server';
import Flex from '@/ui/base/Flex';
import NavBar from '@/shell/NavBar';
import { sessionCookie } from '@/lib/session/sessionCookie';

// Every page with the nav: the browse view, the content pages and the embed
// test pages. Rendered once per document (layoutDefaults), so the nav renders
// once, and navigating between the groups below renders only their layouts.
// The nav reads its artist and title on the client (see browsingArtistContext),
// and renders again on sign-in or sign-out for its account link.
export const layoutOptions = { key: { cookies: [sessionCookie] } } satisfies LayoutOptions;

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <Flex column className="lg:h-[calc(100dvh-var(--preview-banner-height,0px))]">
      <NavBar />
      {children}
    </Flex>
  );
}
