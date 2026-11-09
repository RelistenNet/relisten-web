'use client';

import { href } from '@timber-js/app/routes';
import { usePathname, useRouter } from '@timber-js/app/client';
import { Suspense, use, useMemo, useState } from 'react';
import { browser } from 'react-dom';
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
import { loadArchive, searchArtists } from '@/lib/archiveArtists';
import { artistSections } from '@/lib/artistSections';
import { artistPlays, groupArtists, type ArtistListItem } from '@/lib/artistRows';
import { usePrimaryArtists } from './primaryArtistsContext';

// The artist at the start of the artist tabs: names whose sections the tabs
// are, and switches artist. Lists the primary artists (from the layout, shared
// with the artists column), featured first, then by plays; a search also
// covers the archive, fetched on the first search.

const MAX_RESULTS = 50;

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

export default function ArtistPicker({ current }: { current: { slug: string; name: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const select = (artist: ArtistListItem) => {
    setOpen(false);
    if (artist.slug !== current.slug) router.push(sectionHref(pathname, current.slug, artist));
  };

  return (
    <Popover open={open} onOpenChange={setOpen} align="start" sideOffset={6}>
      <PopoverTrigger
        aria-label={`Artist: ${current.name}. Switch artist`}
        className="
          flex h-7 max-w-56 cursor-pointer items-center gap-1 rounded-md border border-accent/40
          bg-accent/10 px-2 font-medium text-text-primary hover:bg-accent/20
        "
      >
        <span className="truncate">{current.name}</span>
        <ChevronDown className="size-3.5 shrink-0 text-text-secondary" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-1rem))] p-0">
        <PickerPanel currentSlug={current.slug} onSelect={select} />
      </PopoverContent>
    </Popover>
  );
}

/**
 * The open picker. It holds the search: the popover unmounts it on close, so
 * each opening starts with an empty search.
 */
function PickerPanel({
  currentSlug,
  onSelect,
}: {
  currentSlug: string;
  onSelect: (artist: ArtistListItem) => void;
}) {
  const [query, setQuery] = useState('');
  const primary = usePrimaryArtists();
  const artists = useMemo(
    () => [...primary].sort((a, b) => artistPlays(b) - artistPlays(a)),
    [primary]
  );
  const search = query.trim();

  const item = (artist: ArtistListItem) => (
    <CommandItem
      key={artist.slug}
      value={artist.slug}
      data-checked={artist.slug === currentSlug}
      onSelect={() => onSelect(artist)}
    >
      {artist.name}
    </CommandItem>
  );

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Search artists…"
        value={query}
        onValueChange={setQuery}
        autoFocus
      />
      <CommandList className="max-h-80">
        {search ? (
          // The first search fetches the archive; until it arrives, the
          // primary artists' matches show.
          <Suspense fallback={<Matches artists={artists} query={search} item={item} />}>
            <MatchesWithArchive artists={artists} query={search} item={item} />
          </Suspense>
        ) : (
          groupArtists(artists).map((group) => (
            <CommandGroup key={group.key} heading={group.label}>
              {group.artists.map(item)}
            </CommandGroup>
          ))
        )}
      </CommandList>
    </Command>
  );
}

type MatchesProps = {
  artists: ArtistListItem[];
  query: string;
  item: (artist: ArtistListItem) => React.ReactNode;
  /** Absent while it loads; `null` if it failed, which searches the primary artists alone. */
  archive?: ArtistListItem[] | null;
};

function Matches({ artists, archive, query, item }: MatchesProps) {
  const matches = searchArtists([artists, archive ?? []], query).slice(0, MAX_RESULTS);
  return (
    <>
      <CommandEmpty>{archive === undefined ? 'Searching…' : 'No artists found.'}</CommandEmpty>
      {matches.map((m) => item(m.artist))}
    </>
  );
}

function MatchesWithArchive(props: Omit<MatchesProps, 'archive'>) {
  use(browser());
  return <Matches {...props} archive={use(loadArchive())} />;
}
