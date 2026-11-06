'use client';

import { Link, usePathname } from '@timber-js/app/client';
import cn from '@/lib/cn';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import {
  artistRecentlyAddedUrl,
  artistSongsUrl,
  artistTodayUrl,
  artistToursUrl,
  artistUrl,
  artistVenuesUrl,
} from '@/lib/urls';
import type { Features } from '@/types';

// The artist's sections, under the nav bar on every page: the artist in the URL
// (/grateful-dead/… browse, /artists/grateful-dead/… detail pages), else the
// default artist, which is what / browses. Bridges
// the two: Browse is the browse view (artist → year → show); every other tab is
// a detail page under /artists/{artist}.
//
// Active state comes from the pathname on the client: this lives in a layout
// that persists across navigations, so server-computed state would go stale.

type Tab = { label: string; href: string; isActive: (path: string) => boolean };

function tabsFor(artistSlug: string, features?: Partial<Features>): Tab[] {
  const browse = `/${artistSlug}`;
  const under = (prefix: string) => (path: string) =>
    path === prefix || path.startsWith(`${prefix}/`);

  const tabs: Tab[] = [
    {
      label: 'Browse',
      href: browse,
      // The browse view; / is the default artist's browse view.
      isActive: (p) => (p === '/' && artistSlug === DEFAULT_ARTIST_SLUG) || under(browse)(p),
    },
    {
      label: 'Overview',
      href: artistUrl(artistSlug),
      isActive: (p) => p === artistUrl(artistSlug),
    },
  ];
  const page = (label: string, href: string): Tab => ({ label, href, isActive: under(href) });
  if (features?.songs) tabs.push(page('Songs', artistSongsUrl(artistSlug)));
  if (features?.per_show_venues || features?.per_source_venues) {
    tabs.push(page('Venues', artistVenuesUrl(artistSlug)));
  }
  if (features?.tours) tabs.push(page('Tours', artistToursUrl(artistSlug)));
  tabs.push(
    page('Recently Added', artistRecentlyAddedUrl(artistSlug)),
    page('Today In History', artistTodayUrl(artistSlug))
  );
  return tabs;
}

export default function ArtistTabs({
  artistSlug,
  features,
}: {
  artistSlug: string;
  features?: Partial<Features>;
}) {
  const pathname = usePathname();
  const tabs = tabsFor(artistSlug, features);

  return (
    <nav
      aria-label="Artist"
      className="overflow-x-auto border-b border-b-hairline bg-surface-raised px-2 lg:px-4"
    >
      <ul role="list" className="flex h-9 items-stretch gap-1 text-sm whitespace-nowrap">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <li key={tab.label} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center border-b-2 px-2 text-text-secondary hover:text-text-primary',
                  active ? 'border-accent text-text-primary' : 'border-transparent'
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
