'use client';

import { useLayoutEffect, useRef } from 'react';
import { href } from '@timber-js/app/routes';
import { Link, useLinkStatus, usePathname } from '@timber-js/app/client';
import cn from '@/lib/cn';
import { artistSections } from '@/lib/artistSections';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import ArtistPicker from './ArtistPicker';
import { useBrowsingArtistRow } from './browsingArtistContext';
import { siteSections } from './siteSections';
import type { ArtistFeatures } from '@/domain/types';

// The artist's sections, under the nav bar on every page: the artist in the URL
// (/grateful-dead/… browse, /artists/grateful-dead/… detail pages), else the
// default artist, which is what / browses. Bridges the two: Browse is the
// browse view (artist → year → show); Shows is the same shows as one table;
// every other tab is a detail page under /artists/{artist}. Led by the artist
// picker, which switches artist. The same on every page, the site's pages
// included: there no tab is active, and the row is the way back to the artist.
//
// At xl the row's right end holds the site's own pages (Playlists, Today, …),
// labelled "All artists" because the artist's tabs have a Playlists and a
// Venues of their own. Below xl they're in the Site menu.
//
// Active state comes from the pathname on the client: this lives in a layout
// that persists across navigations, so server-computed state would go stale.

type Tab = { label: string; href: string; isActive: (path: string) => boolean };

function tabsFor(artistSlug: string, features?: Partial<ArtistFeatures>): Tab[] {
  const browse = href('/[artistSlug]', { artistSlug });
  const shows = href('/artists/[artistSlug]', { artistSlug });
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
      label: 'Shows',
      href: shows,
      // A show's page is part of it.
      isActive: (p) => p === shows || p.startsWith(`${shows}/shows/`),
    },
  ];
  const page = (label: string, href: string): Tab => ({ label, href, isActive: under(href) });
  const sections = artistSections(features);
  if (sections.songs) tabs.push(page('Songs', href('/artists/[artistSlug]/songs', { artistSlug })));
  if (sections.venues) {
    tabs.push(page('Venues', href('/artists/[artistSlug]/venues', { artistSlug })));
  }
  tabs.push(
    page('Playlists', href('/artists/[artistSlug]/playlists', { artistSlug })),
    page('Recently Added', href('/artists/[artistSlug]/recently-added', { artistSlug })),
    page('Today in History', href('/artists/[artistSlug]/today-in-history', { artistSlug }))
  );
  return tabs;
}

export default function ArtistTabs() {
  const artist = useBrowsingArtistRow();
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);

  // On a phone the tabs overflow: bring the active one into view, centered,
  // when the page changes. Only the list scrolls, never the page.
  useLayoutEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !tab) return;
    const l = list.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    if (t.left >= l.left && t.right <= l.right) return;
    list.scrollLeft += t.left - l.left - (l.width - t.width) / 2;
  }, [pathname]);

  const tabs = tabsFor(artist.slug, artist.features);

  return (
    <nav
      aria-label="Artist"
      className="flex h-9 items-center border-b border-b-hairline bg-surface-raised pl-2 text-sm lg:pl-4"
    >
      <div className="flex shrink-0 items-center">
        <ArtistPicker current={artist} />
        {/* ml-3, and mr-1 plus the first tab's px-2.5: about 12px either side. */}
        <span aria-hidden className="mr-1 ml-3 h-4 w-px shrink-0 bg-hairline" />
      </div>
      {/* The picker stays put; the tabs scroll when they don't fit. */}
      <ul
        ref={listRef}
        role="list"
        className="flex h-full min-w-0 items-stretch gap-0.5 overflow-x-auto pr-2 whitespace-nowrap lg:pr-4"
      >
        {tabs.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <li key={tab.label} className="m-0 flex">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center px-2.5 text-text-secondary hover:text-text-primary',
                  active && 'text-text-primary'
                )}
              >
                <TabLabel label={tab.label} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
      <SiteLinks pathname={pathname} />
    </nav>
  );
}

/** The site's pages, about no one artist, at the right end of the row. */
function SiteLinks({ pathname }: { pathname: string }) {
  return (
    <div className="ml-auto flex h-full shrink-0 items-stretch pr-2 max-xl:hidden lg:pr-4">
      <span className="flex items-center pr-1.5 pl-2 text-text-muted">All artists:</span>
      <ul role="list" className="m-0 flex h-full list-none items-stretch gap-0.5 p-0">
        {siteSections
          .filter((s) => s.group === 'explore')
          .map((s) => {
            const active = pathname === s.href || pathname.startsWith(`${s.href}/`);
            return (
              <li key={s.href} className="m-0 flex">
                <Link
                  href={s.href}
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex items-center px-2.5 text-text-secondary hover:text-text-primary',
                    active && 'text-text-primary'
                  )}
                >
                  <TabLabel label={s.label} active={active} />
                </Link>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/** The tab's label and underline. A clicked tab shows a faded underline until the page arrives. */
function TabLabel({ label, active }: { label: string; active: boolean }) {
  const { isPending } = useLinkStatus();
  return (
    <>
      <span className={cn(isPending && 'text-text-primary')}>{label}</span>
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 bottom-0 h-0.5',
          isPending ? 'bg-accent/50' : active ? 'bg-accent' : 'bg-transparent'
        )}
      />
    </>
  );
}
