'use client';

import { href } from '@timber-js/app/routes';
import { Link, useLinkStatus, usePathname } from '@timber-js/app/client';
import cn from '@/lib/cn';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';
import type { ArtistFeatures } from '@/domain/types';

// The artist's sections, under the nav bar on every page: the artist in the URL
// (/grateful-dead/… browse, /artists/grateful-dead/… detail pages), else the
// default artist, which is what / browses. Bridges
// the two: Browse is the browse view (artist → year → show); every other tab is
// a detail page under /artists/{artist}.
//
// Active state comes from the pathname on the client: this lives in a layout
// that persists across navigations, so server-computed state would go stale.

type Tab = { label: string; href: string; isActive: (path: string) => boolean };

/** The Tours tab is hidden until tours are ready; flip this to bring it back. */
const SHOW_TOURS_TAB = false;

function tabsFor(artistSlug: string, features?: Partial<ArtistFeatures>): Tab[] {
  const browse = href('/[artistSlug]', { artistSlug });
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
      href: href('/artists/[artistSlug]', { artistSlug }),
      isActive: (p) => p === href('/artists/[artistSlug]', { artistSlug }),
    },
  ];
  const page = (label: string, href: string): Tab => ({ label, href, isActive: under(href) });
  // Songs come from normalization; the older setlist songs flag can be set on
  // artists with no songs, so it doesn't count.
  if (features?.normalization) {
    tabs.push(page('Songs', href('/artists/[artistSlug]/songs', { artistSlug })));
  }
  if (features?.perShowVenues || features?.perSourceVenues) {
    tabs.push(page('Venues', href('/artists/[artistSlug]/venues', { artistSlug })));
  }
  if (SHOW_TOURS_TAB && features?.tours)
    tabs.push(page('Tours', href('/artists/[artistSlug]/tours', { artistSlug })));
  tabs.push(
    page('Recently Added', href('/artists/[artistSlug]/recently-added', { artistSlug })),
    page('Today In History', href('/artists/[artistSlug]/today-in-history', { artistSlug }))
  );
  return tabs;
}

export default function ArtistTabs({
  artistSlug,
  features,
}: {
  artistSlug: string;
  features?: Partial<ArtistFeatures>;
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
                  'relative flex items-center px-2 text-text-secondary hover:text-text-primary',
                  active && 'text-text-primary'
                )}
              >
                <TabLabel label={tab.label} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
