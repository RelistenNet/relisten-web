'use client';

import { createContext, Suspense, use, useState } from 'react';
import { browser } from 'react-dom';
import { usePathname, useSegmentParams } from '@timber-js/app/client';
import type { ArtistFeatures } from '@/domain/types';
import { loadArchive } from '@/lib/archiveArtists';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { usePrimaryArtists } from './primaryArtistsContext';

// The artist the visitor is browsing, for the life of the document: the URL's
// artist on an artist's page (the browse root's is the default artist), and on
// the site's pages (today, live, …) the last one, or the one picked in their
// nav. The nav's artist picker and tabs show this artist on every page.
//
// Read from the URL as the provider renders: no page reports its artist, the
// server renders it too, and the nav needs nothing from the server about the
// artist. A full page load starts over, so a site page loaded directly shows
// the default artist.

export type NavArtist = { slug: string; name: string; features?: Partial<ArtistFeatures> };

/** The artist's slug, and its row when picked in the nav (any artist, archive included). */
type Browsing = { slug: string; artist?: NavArtist };

type BrowsingArtist = {
  browsing: Browsing;
  /**
   * A site page (today, live, …): the artist is context, not the page's
   * subject. Picking one switches it in place, and the header shows the
   * page's title.
   */
  onSitePage: boolean;
  /** On a site page: browse another artist, without navigating. */
  setArtist: (artist: NavArtist) => void;
};

const BrowsingArtistContext = createContext<BrowsingArtist | null>(null);

export function BrowsingArtistProvider({ children }: { children: React.ReactNode }) {
  const { artistSlug } = useSegmentParams() as { artistSlug?: string };
  const pathname = usePathname();
  const urlSlug = artistSlug ?? (pathname === '/' ? DEFAULT_ARTIST_SLUG : undefined);

  const [browsing, setBrowsing] = useState<Browsing>({ slug: urlSlug ?? DEFAULT_ARTIST_SLUG });
  // An artist's page makes its artist the one browsed. Set while rendering,
  // React's pattern for state that follows a changing input.
  if (urlSlug && urlSlug !== browsing.slug) setBrowsing({ slug: urlSlug });

  const setArtist = (artist: NavArtist) => setBrowsing({ slug: artist.slug, artist });
  return (
    <BrowsingArtistContext value={{ browsing, onSitePage: !urlSlug, setArtist }}>
      {children}
    </BrowsingArtistContext>
  );
}

export function useBrowsingArtist(): BrowsingArtist {
  const ctx = use(BrowsingArtistContext);
  if (!ctx) throw new Error('useBrowsingArtist needs a <BrowsingArtistProvider> above it');
  return ctx;
}

/**
 * Renders `children` with the row of the artist being browsed: the one picked,
 * a primary artist, or an archive artist from the archive list (browser only;
 * until it arrives, the slug with no name or features). A slug that is no
 * artist (a 404 page's) gets the default artist.
 */
export function WithBrowsingArtist({
  children,
}: {
  children: (artist: NavArtist) => React.ReactNode;
}) {
  const { browsing } = useBrowsingArtist();
  const primary = usePrimaryArtists();

  const found = browsing.artist ?? primary.find((a) => a.slug === browsing.slug);
  if (found) return children(found);
  const pending = { slug: browsing.slug, name: '' };
  const fallback = primary.find((a) => a.slug === DEFAULT_ARTIST_SLUG) ?? pending;
  return (
    <Suspense fallback={children(pending)}>
      <ArchiveArtist slug={browsing.slug} fallback={fallback}>
        {children}
      </ArchiveArtist>
    </Suspense>
  );
}

function ArchiveArtist({
  slug,
  fallback,
  children,
}: {
  slug: string;
  fallback: NavArtist;
  children: (artist: NavArtist) => React.ReactNode;
}) {
  use(browser());
  return children(use(loadArchive())?.find((a) => a.slug === slug) ?? fallback);
}
