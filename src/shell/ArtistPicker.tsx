'use client';

import { href } from '@timber-js/app/routes';
import { usePathname } from '@timber-js/app/client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/base/shadcn/popover';
import ArtistsSelectionTab from '@/features/browse/ArtistsSelectionTab';
import { artistSections } from '@/lib/artistSections';
import type { ArtistListItem } from '@/lib/artistRows';

// The artist the page is about, as a control that switches artist: the
// header's title ("RELISTEN TO THE GRATEFUL DEAD") on wide screens, the start
// of the artist tabs on narrow ones, where the title is hidden. Opens the same artist list as the browse view's
// artists column (compact), whose rows here link to the same section for the
// chosen artist. The popover mounts the list only while open, so each opening
// starts with an empty filter.

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

const TRIGGER = {
  // Reads as the title it replaces; the chevron and hover say it opens.
  title: `
    inline-flex cursor-pointer items-center gap-1 rounded px-1 -mx-1 uppercase
    hover:bg-text-primary/5
  `,
  tab: `
    flex h-7 max-w-56 cursor-pointer items-center gap-1 rounded-md border border-accent/40
    bg-accent/10 px-2 font-medium text-text-primary hover:bg-accent/20
  `,
};

export default function ArtistPicker({
  current,
  variant,
  children = current.name,
}: {
  current: { slug: string; name: string };
  variant: keyof typeof TRIGGER;
  /** The trigger's label; the artist's name by default. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Popover open={open} onOpenChange={setOpen} align="start" sideOffset={6}>
      <PopoverTrigger
        aria-label={`Artist: ${current.name}. Switch artist`}
        className={TRIGGER[variant]}
      >
        <span className="truncate">{children}</span>
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
        <ArtistsSelectionTab
          compact
          currentSlug={current.slug}
          hrefFor={(artist) => sectionHref(pathname, current.slug, artist)}
          onNavigate={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
