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
import { fromArtistRow, type ArtistListItem, type ArtistRow } from '@/lib/artistRows';

// The artist at the start of the artist tabs: names whose sections the tabs
// are, and switches artist. Lists the primary artists (the artists column's
// rows, sent with the page), featured first, then by plays; a search also
// covers the archive, fetched on the first search.

const plays = (a: ArtistListItem) => a.popularity?.windows?.['30d']?.plays ?? 0;

const MAX_RESULTS = 50;

/** The same section for another artist: Browse goes to the artist's browse root. */
function sectionHref(pathname: string, fromSlug: string, artistSlug: string): string {
  const prefix = href('/artists/[artistSlug]', { artistSlug: fromSlug });
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
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
  rows,
  current,
}: {
  rows: ArtistRow[];
  current: { slug: string; name: string };
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const artists = useMemo(
    () => rows.map(fromArtistRow).sort((a, b) => plays(b) - plays(a)),
    [rows]
  );

  const search = query.trim();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };

  const select = (slug: string) => {
    onOpenChange(false);
    if (slug !== current.slug) router.push(sectionHref(pathname, current.slug, slug));
  };

  const item = (artist: ArtistListItem) => (
    <CommandItem
      key={artist.slug}
      value={artist.slug}
      data-checked={artist.slug === current.slug}
      onSelect={select}
    >
      {artist.name}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange} align="start" sideOffset={6}>
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
