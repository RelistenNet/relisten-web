'use client';

import { Link, usePathname } from '@timber-js/app/client';
import { useBrowsingArtist } from './browsingArtistContext';

// The site's pages' titles, by first path segment: "RELISTEN TO TODAY IN HISTORY".
const pages = {
  'sonos': { prefix: 'ON', title: 'SONOS' },
  'app': { prefix: 'ON THE', title: 'GO' },
  'today': { prefix: 'TO', title: 'TODAY IN HISTORY' },
  'recently-played': { prefix: 'WITH', title: 'OTHERS' },
  'venues': { prefix: 'AT', title: 'EVERY VENUE' },
  'chat': { prefix: 'WITH', title: 'US' },
  'about': { prefix: 'TO', title: 'OUR LIFE STORY' },
  'blog': { prefix: 'TO', title: 'OUR BLOG' },
};

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
  const page = pages[pathname.split('/')[1] as keyof typeof pages];
  if (!page) return null;
  return (
    <>
      <span className="to">{page.prefix}</span>
      <Link href={pathname}>{page.title}</Link>
    </>
  );
}
