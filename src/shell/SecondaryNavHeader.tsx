'use client';

import { Link, usePathname } from '@timber-js/app/client';
import { href } from '@timber-js/app/routes';
import { useBrowsingArtist } from './browsingArtistContext';

type Page = { prefix: string; title: string; href?: string };

const playlists: Page = { prefix: 'TO', title: 'PLAYLISTS', href: href('/playlists') };

// The site's pages' titles, by first path segment: "RELISTEN TO TODAY IN HISTORY".
// A title with an href links to its section's index (a playlist goes back to
// every playlist); otherwise to the page itself.
const pages: Record<string, Page> = {
  'sonos': { prefix: 'ON', title: 'SONOS' },
  'app': { prefix: 'ON THE', title: 'GO' },
  'today': { prefix: 'TO', title: 'TODAY IN HISTORY' },
  'recently-played': { prefix: 'WITH', title: 'OTHERS' },
  'venues': { prefix: 'AT', title: 'EVERY VENUE' },
  'chat': { prefix: 'WITH', title: 'US' },
  'about': { prefix: 'TO', title: 'OUR LIFE STORY' },
  'blog': { prefix: 'TO', title: 'OUR BLOG' },
  'playlists': playlists,
};

/** The page's title, by first path segment. */
const pageFor = (pathname: string): Page | undefined => pages[pathname.split('/')[1] ?? ''];

/**
 * The header title after RELISTEN, on the site's pages only: the
 * page's own ("TO TODAY IN HISTORY"). Elsewhere the header is just RELISTEN;
 * the artist is the artist tabs', below.
 */
export default function SecondaryNavBar() {
  const pathname = usePathname();
  if (!useBrowsingArtist().onSitePage) return null;

  // The first path segment, not useSelectedLayoutSegments(): this renders in
  // layouts at different depths, and the pathname reads the same from each.
  const page = pageFor(pathname);
  if (!page) return null;
  return (
    <>
      <span className="to">{page.prefix}</span>
      <Link href={page.href ?? pathname}>{page.title}</Link>
    </>
  );
}
