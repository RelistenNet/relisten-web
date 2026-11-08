'use client';

import { href } from '@timber-js/app/routes';
import { usePathname, useRouter } from '@timber-js/app/client';
import { useEffect, useMemo, useState } from 'react';
import { fuzzyMatch } from '@nozbe/microfuzz';
import { ChevronDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/base/shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/base/shadcn/popover';
import { createArchiveLoader } from '@/lib/archiveArtists';
import type { ArtistListItem } from '@/lib/artistRows';

// The artist at the start of the artist tabs: names whose sections the tabs
// are, and switches artist. Lists the primary artists (sent with the page,
// featured first); a search also covers the archive, fetched on the first
// search.

export type PickerArtist = Pick<ArtistListItem, 'slug' | 'name' | 'featured'>;

const MAX_RESULTS = 50;

/** The same section for another artist: Browse goes to the artist's browse root. */
function sectionHref(pathname: string, fromSlug: string | undefined, artistSlug: string): string {
  const prefix = fromSlug && `/artists/${fromSlug}`;
  if (!prefix || (pathname !== prefix && !pathname.startsWith(`${prefix}/`))) {
    return href('/[artistSlug]', { artistSlug });
  }
  // Detail pages (a song, a venue) go to their section's index.
  switch (pathname.slice(prefix.length).split('/')[1]) {
    case 'songs':
      return href('/artists/[artistSlug]/songs', { artistSlug });
    case 'venues':
      return href('/artists/[artistSlug]/venues', { artistSlug });
    case 'tours':
      return href('/artists/[artistSlug]/tours', { artistSlug });
    case 'recently-added':
      return href('/artists/[artistSlug]/recently-added', { artistSlug });
    case 'today-in-history':
      return href('/artists/[artistSlug]/today-in-history', { artistSlug });
    case 'top':
      return href('/artists/[artistSlug]/top', { artistSlug });
    default:
      return href('/artists/[artistSlug]', { artistSlug });
  }
}

export default function ArtistPicker({
  artists,
  current,
}: {
  artists: PickerArtist[];
  current?: { slug: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loadArchive] = useState(createArchiveLoader);
  const [archive, setArchive] = useState<ArtistListItem[] | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const searching = query.trim() !== '';
  useEffect(() => {
    if (!searching || archive) return;
    let live = true;
    // A failed fetch searches the primary artists alone.
    void loadArchive().then((rows) => live && setArchive(rows ?? []));
    return () => {
      live = false;
    };
  }, [searching, archive, loadArchive]);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const scored: { artist: PickerArtist; score: number }[] = [];
    for (const list of [artists, archive ?? []]) {
      for (const artist of list) {
        const result = fuzzyMatch(artist.name, q);
        if (result) scored.push({ artist, score: result.score });
      }
    }
    return scored
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_RESULTS)
      .map((s) => s.artist);
  }, [artists, archive, query]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };

  const select = (slug: string) => {
    onOpenChange(false);
    if (slug !== current?.slug) router.push(sectionHref(pathname, current?.slug, slug));
  };

  const item = (artist: PickerArtist) => (
    <CommandItem
      key={artist.slug}
      value={artist.slug}
      data-checked={artist.slug === current?.slug}
      onSelect={select}
    >
      {artist.name}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange} align="start" sideOffset={6}>
      <PopoverTrigger
        aria-label={current ? `Artist: ${current.name}. Switch artist` : 'Choose an artist'}
        className="
          flex h-7 max-w-56 cursor-pointer items-center gap-1 rounded-md border border-accent/40
          bg-accent/10 px-2 font-medium text-text-primary hover:bg-accent/20
        "
      >
        <span className="truncate">{current?.name ?? 'Choose an artist'}</span>
        <ChevronDown className="size-3.5 shrink-0 text-text-secondary" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-1rem))] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search artists…"
            value={query}
            onValueChange={setQuery}
            autoFocus
          />
          <CommandList className="max-h-80">
            {searching ? (
              <>
                <CommandEmpty>{archive ? 'No artists found.' : 'Searching…'}</CommandEmpty>
                {matches.map(item)}
              </>
            ) : (
              <>
                <CommandGroup heading="Featured Artists">
                  {artists.filter((a) => Number(a.featured) === 1).map(item)}
                </CommandGroup>
                <CommandGroup heading="Primary Artists">
                  {artists.filter((a) => Number(a.featured) !== 1).map(item)}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
