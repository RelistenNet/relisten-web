'use client';

import { href } from '@timber-js/app/routes';
import { Link, useLinkStatus, usePathname } from '@timber-js/app/client';
import cn from '@/lib/cn';
import { artistSections } from '@/lib/artistSections';
import ArtistPicker, { type PickerArtist } from './ArtistPicker';
import type { ArtistFeatures } from '@/domain/types';

// The artist's sections, under the nav bar on pages with an artist in the URL
// (/grateful-dead/… browse, /artists/grateful-dead/… detail pages), led by the
// artist picker so the tabs read as that artist's. On / (no artist yet) the bar
// holds the picker alone. Bridges the two URL trees: Browse is the browse view
// (artist → year → show); every other tab is a detail page under /artists/{artist}.
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
    { label: 'Browse', href: browse, isActive: under(browse) },
    {
      label: 'Overview',
      href: href('/artists/[artistSlug]', { artistSlug }),
      isActive: (p) => p === href('/artists/[artistSlug]', { artistSlug }),
    },
  ];
  const page = (label: string, href: string): Tab => ({ label, href, isActive: under(href) });
  const sections = artistSections(features);
  if (sections.songs) tabs.push(page('Songs', href('/artists/[artistSlug]/songs', { artistSlug })));
  if (sections.venues) {
    tabs.push(page('Venues', href('/artists/[artistSlug]/venues', { artistSlug })));
  }
  if (SHOW_TOURS_TAB && sections.tours)
    tabs.push(page('Tours', href('/artists/[artistSlug]/tours', { artistSlug })));
  tabs.push(
    page('Recently Added', href('/artists/[artistSlug]/recently-added', { artistSlug })),
    page('Today In History', href('/artists/[artistSlug]/today-in-history', { artistSlug }))
  );
  return tabs;
}

export default function ArtistTabs({
  artist,
  pickerArtists,
}: {
  /** The artist in the URL; without one, the bar is the picker alone. */
  artist?: { slug: string; name: string; features?: Partial<ArtistFeatures> };
  pickerArtists: PickerArtist[];
}) {
  const pathname = usePathname();
  const tabs = artist ? tabsFor(artist.slug, artist.features) : [];

  return (
    <nav
      aria-label="Artist"
      className="flex h-9 items-center border-b border-b-hairline bg-surface-raised pl-2 text-sm lg:pl-4"
    >
      <ArtistPicker artists={pickerArtists} current={artist} />
      {tabs.length > 0 && (
        <>
          <span aria-hidden className="mx-2 h-4 w-px shrink-0 bg-hairline" />
          {/* The picker stays put; the tabs scroll when they don't fit. */}
          <ul
            role="list"
            className="flex h-full min-w-0 items-stretch gap-1 overflow-x-auto pr-2 whitespace-nowrap lg:pr-4"
          >
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
        </>
      )}
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
