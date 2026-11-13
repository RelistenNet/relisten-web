'use client';

import { href } from '@timber-js/app/routes';
import { usePathname } from '@timber-js/app/client';
import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/base/shadcn/popover';
import ArtistsSelectionTab from '@/features/browse/ArtistsSelectionTab';
import { artistSections } from '@/lib/artistSections';
import type { ArtistListItem } from '@/lib/artistRows';
import { useBrowsingArtist } from './browsingArtistContext';

// The nav's artist, as a control that switches artist: the start of the
// artist tabs, at every width. Opens the same artist list as the browse view's
// artists column (compact), whose rows here link to the same section for the
// chosen artist. The popover mounts the list only while open, so each opening
// starts with an empty filter.
//
// On the site's pages (today, live, …) the artist is context rather than the
// page's subject (onSitePage): choosing one stays on the page and switches
// the artist being browsed (browsingArtistContext), so the artist tabs. The rows still link to the artist's browse view, for a new tab.

/**
 * The same section for another artist: Browse goes to the artist's browse
 * root, and a section the artist doesn't have goes to its overview.
 */
function sectionHref(pathname: string, fromSlug: string, to: ArtistListItem): string {
  const artistSlug = to.slug;
  const prefix = href('/artists/[artistSlug]', { artistSlug: fromSlug });
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
    return href('/[artistSlug]', { artistSlug });
  }
  const has = artistSections(to.features);
  // Detail pages (a song, a venue) go to their section's index.
  switch (pathname.slice(prefix.length).split('/')[1]) {
    case 'songs':
      if (!has.songs) break;
      return href('/artists/[artistSlug]/songs', { artistSlug });
    case 'venues':
      if (!has.venues) break;
      return href('/artists/[artistSlug]/venues', { artistSlug });
    case 'tours':
      if (!has.tours) break;
      return href('/artists/[artistSlug]/tours', { artistSlug });
    case 'recently-added':
      return href('/artists/[artistSlug]/recently-added', { artistSlug });
    case 'today-in-history':
      return href('/artists/[artistSlug]/today-in-history', { artistSlug });
    case 'top':
      return href('/artists/[artistSlug]/top', { artistSlug });
  }
  return href('/artists/[artistSlug]', { artistSlug });
}

// A fixed width, so switching artist (or an archive artist's name arriving)
// doesn't shift the tabs; a longer name is truncated.
const TRIGGER = `
  flex h-6 w-36 cursor-pointer items-center gap-1 rounded-md border border-accent/40
  bg-accent/10 pr-1.5 pl-2 text-[13px] font-medium text-text-primary hover:bg-accent/20
`;

export default function ArtistPicker({
  current,
}: {
  /** The artist; its name is empty while an archive artist's row loads. */
  current: { slug: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // On a site page, choosing an artist switches the one browsed in place.
  const { onSitePage: chooseInPlace, setArtist } = useBrowsingArtist();
  // Each row's link, back to its artist: the row's click finds its artist here.
  const artistByHref = useRef(new Map<string, ArtistListItem>());
  const hrefFor = (artist: ArtistListItem) => {
    const url = sectionHref(pathname, current.slug, artist);
    artistByHref.current.set(url, artist);
    return url;
  };

  // Capturing, so it runs before the row's own click handler starts a navigation.
  const choose = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest('a[href]');
    const artist = link && artistByHref.current.get(link.getAttribute('href') ?? '');
    if (!artist) return;
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setArtist({ slug: artist.slug, name: artist.name, features: artist.features });
  };

  return (
    <Popover open={open} onOpenChange={setOpen} align="start" sideOffset={6}>
      <PopoverTrigger aria-label={`Artist: ${current.name}. Switch artist`} className={TRIGGER}>
        {current.name ? (
          <span className="min-w-0 flex-1 truncate text-left">{current.name}</span>
        ) : (
          <span aria-hidden className="h-3 flex-1 animate-pulse rounded-sm bg-text-primary/15" />
        )}
        <ChevronDown className="size-3.5 shrink-0 text-text-secondary" />
      </PopoverTrigger>
      <PopoverContent
        // It opens over busy columns: a firmer edge and a deeper shadow than
        // the default popover's hairline, in both themes.
        className="
          w-[min(380px,calc(100vw-1rem))] overflow-hidden p-0 shadow-2xl ring-2
          shadow-black/25 ring-text-primary/15 dark:shadow-black/60
        "
      >
        <div onClickCapture={chooseInPlace ? choose : undefined}>
          <ArtistsSelectionTab
            compact
            currentSlug={current.slug}
            hrefFor={hrefFor}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
