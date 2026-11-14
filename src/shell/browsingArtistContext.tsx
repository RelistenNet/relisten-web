'use client';

import { createContext, use, useState } from 'react';
import { usePathname, useSegmentParams } from '@timber-js/app/client';
import type { ArtistFeatures } from '@/domain/types';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import { usePrimaryArtists } from './primaryArtistsContext';

// The artist the visitor is browsing, for the life of the document: the URL's
// artist on an artist's page (the browse root's is the default artist), and on
// the site's pages (today, live, …) the last one, or the one picked in their
// nav. The nav's artist picker and tabs show this artist on every page.
//
// The slug is read from the URL as the provider renders, so no page reports
// its artist. The row comes from the server's seed ((main)/layout.tsx, which
// sends the URL's artist only when it changes), the primary artists, or the
// default artist. A full page load starts over, so a site page loaded
// directly shows the default artist.

export type NavArtist = { slug: string; name: string; features?: Partial<ArtistFeatures> };

/** The artist's slug, and its row when picked in the nav. */
type Browsing = { slug: string; artist?: NavArtist };

type BrowsingArtist = {
  browsing: Browsing;
  /** The server's row for the last artist the URL named (archive artists included). */
  seeded: NavArtist | null;
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

export function BrowsingArtistProvider({
  seed,
  children,
}: {
  /** The URL's artist row, or null where the URL names no artist. */
  seed: NavArtist | null;
  children: React.ReactNode;
}) {
  const { artistSlug } = useSegmentParams() as { artistSlug?: string };
  const pathname = usePathname();
  const urlSlug = artistSlug ?? (pathname === '/' ? DEFAULT_ARTIST_SLUG : undefined);

  // Both follow a changing input, so they are set while rendering (React's
  // pattern for derived state). An artist's page makes its artist the one
  // browsed; the seed is kept after leaving that artist, for the site's pages.
  const [browsing, setBrowsing] = useState<Browsing>({ slug: urlSlug ?? DEFAULT_ARTIST_SLUG });
  if (urlSlug && urlSlug !== browsing.slug) setBrowsing({ slug: urlSlug });
  const [seeded, setSeeded] = useState(seed);
  if (seed && seed.slug !== seeded?.slug) setSeeded(seed);

  const setArtist = (artist: NavArtist) => setBrowsing({ slug: artist.slug, artist });
  return (
    <BrowsingArtistContext value={{ browsing, seeded, onSitePage: !urlSlug, setArtist }}>
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
 * The row of the artist being browsed: the one picked, the server's seed, or a
 * primary artist. Any other slug (a 404 page's) gets the default artist.
 */
export function useBrowsingArtistRow(): NavArtist {
  const { browsing, seeded } = useBrowsingArtist();
  const primary = usePrimaryArtists();
  return (
    browsing.artist ??
    (seeded?.slug === browsing.slug ? seeded : undefined) ??
    primary.find((a) => a.slug === browsing.slug) ??
    primary.find((a) => a.slug === DEFAULT_ARTIST_SLUG) ?? {
      slug: DEFAULT_ARTIST_SLUG,
      name: 'Grateful Dead',
    }
  );
}
