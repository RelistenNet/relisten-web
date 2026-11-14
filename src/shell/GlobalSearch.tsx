'use client';

import { href } from '@timber-js/app/routes';
import { searchSearchParams } from '@/lib/searchParams/apiSearchParams';
import { use, useCallback, useEffect, useDeferredValue, useState, Suspense } from 'react';
import { useRouter } from '@timber-js/app/client';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/ui/base/shadcn/command';
import { Popover, PopoverTrigger, PopoverContent } from '@/ui/base/shadcn/popover';
import { SearchIcon, MicIcon, MapPinIcon, RouteIcon } from 'lucide-react';
import { EMPTY_SEARCH, type SearchResults } from '@/lib/search';
import cn from '@/lib/cn';

const resolvedEmpty = Promise.resolve(EMPTY_SEARCH);
const searchCache = new Map<string, Promise<SearchResults>>();

function fetchSearchResults(query: string): Promise<SearchResults> {
  if (query.length < 2) return resolvedEmpty;

  let cached = searchCache.get(query);
  if (!cached) {
    if (searchCache.size > 50) {
      const oldest = searchCache.keys().next().value;
      if (oldest !== undefined) searchCache.delete(oldest);
    }
    cached = fetch(searchSearchParams.href('/api/search', { q: query }))
      .then((res) => (res.ok ? (res.json() as Promise<SearchResults>) : EMPTY_SEARCH))
      .catch(() => {
        searchCache.delete(query);
        return EMPTY_SEARCH;
      });
    searchCache.set(query, cached);
  }
  return cached;
}

function SearchResultsList({
  query,
  onNavigate,
}: {
  query: string;
  onNavigate: (href: string) => void;
}) {
  const results = use(fetchSearchResults(query));

  const hasResults =
    results.artists.length > 0 ||
    results.songs.length > 0 ||
    results.venues.length > 0 ||
    results.tours.length > 0;

  if (!hasResults) {
    return <CommandEmpty>No results found.</CommandEmpty>;
  }

  return (
    <>
      {results.artists.length > 0 && (
        <CommandGroup heading="Artists">
          {results.artists.slice(0, 8).map((artist) => (
            <CommandItem
              key={`artist-${artist.slug}`}
              value={`artist-${artist.slug}`}
              onSelect={() => onNavigate(href('/[artistSlug]', { artistSlug: artist.slug }))}
            >
              <MicIcon className="size-4 text-text-muted" />
              <span>{artist.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {results.artists.length > 0 &&
        (results.songs.length > 0 || results.venues.length > 0 || results.tours.length > 0) && (
          <CommandSeparator />
        )}

      {results.songs.length > 0 && (
        <CommandGroup heading="Songs">
          {results.songs.slice(0, 8).map((song) => (
            <CommandItem
              key={`song-${song.artist.slug}-${song.slug}`}
              value={`song-${song.artist.slug}-${song.slug}`}
              onSelect={() =>
                onNavigate(
                  href('/artists/[artistSlug]/songs/[songSlug]', {
                    artistSlug: song.artist.slug,
                    songSlug: song.slug,
                  })
                )
              }
            >
              <SearchIcon className="size-4 text-text-muted" />
              <div className="flex flex-col">
                <span>{song.name}</span>
                <span className="text-xs text-text-muted">
                  {song.artist.name} · {song.show_count} shows
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {results.songs.length > 0 && (results.venues.length > 0 || results.tours.length > 0) && (
        <CommandSeparator />
      )}

      {results.venues.length > 0 && (
        <CommandGroup heading="Venues">
          {results.venues.slice(0, 8).map((venue) => (
            <CommandItem
              key={`venue-${venue.artist.slug}-${venue.slug}`}
              value={`venue-${venue.artist.slug}-${venue.slug}`}
              onSelect={() =>
                onNavigate(
                  href('/artists/[artistSlug]/venues/[venueSlug]', {
                    artistSlug: venue.artist.slug,
                    venueSlug: venue.slug,
                  })
                )
              }
            >
              <MapPinIcon className="size-4 text-text-muted" />
              <div className="flex flex-col">
                <span>{venue.name}</span>
                <span className="text-xs text-text-muted">
                  {venue.artist.name}
                  {venue.location ? ` · ${venue.location}` : ''}
                  {venue.show_count ? ` · ${venue.show_count} shows` : ''}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {results.venues.length > 0 && results.tours.length > 0 && <CommandSeparator />}

      {results.tours.length > 0 && (
        <CommandGroup heading="Tours">
          {results.tours.slice(0, 6).map((tour) => (
            <CommandItem
              key={`tour-${tour.artist.slug}-${tour.slug}`}
              value={`tour-${tour.artist.slug}-${tour.slug}`}
              onSelect={() =>
                onNavigate(
                  href('/artists/[artistSlug]/tours/[tourSlug]', {
                    artistSlug: tour.artist.slug,
                    tourSlug: tour.slug,
                  })
                )
              }
            >
              <RouteIcon className="size-4 text-text-muted" />
              <div className="flex flex-col">
                <span>{tour.name}</span>
                <span className="text-xs text-text-muted">
                  {tour.artist.name}
                  {tour.show_count ? ` · ${tour.show_count} shows` : ''}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </>
  );
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = inputValue.length >= 2 && inputValue !== deferredQuery;
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (inputValue.length < 2) return;
    const timer = setTimeout(() => setQuery(inputValue), 200);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      setInputValue('');
      setQuery('');
      router.push(href);
    },
    [router]
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setInputValue('');
      setQuery('');
    }
  }, []);

  const showHint = inputValue.length < 2;
  const showResults = !showHint && deferredQuery.length >= 2;

  return (
    <Popover open={open} onOpenChange={handleOpenChange} align="end" sideOffset={8}>
      <PopoverTrigger
        className="
          hidden h-8 cursor-pointer items-center gap-2 rounded-md border border-hairline
          bg-surface-elevated px-3 text-xs text-text-muted transition-colors
          hover:bg-surface-hover lg:flex
        "
      >
        <SearchIcon className="size-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd
          className="
            pointer-events-none ml-1 hidden rounded border border-hairline bg-surface-raised
            px-1.5 py-0.5 font-mono text-[10px] text-text-muted
            sm:inline-block
          "
        >
          ⌘K
        </kbd>
      </PopoverTrigger>

      <PopoverContent className="w-[min(420px,calc(100vw-1rem))] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search artists, songs, venues..."
            value={inputValue}
            onValueChange={(value) => {
              setInputValue(value);
              if (value.length < 2) setQuery(value);
            }}
            autoFocus
          />
          <CommandList className="max-h-80">
            {showHint && (
              <CommandEmpty className="text-text-muted">
                Type to search across all of Relisten...
              </CommandEmpty>
            )}

            {!showHint && !showResults && (
              <CommandEmpty className="text-text-muted">Searching...</CommandEmpty>
            )}

            {showResults && (
              <div className={cn('transition-opacity duration-150', isStale && 'opacity-50')}>
                <Suspense
                  fallback={<CommandEmpty className="text-text-muted">Searching...</CommandEmpty>}
                >
                  <SearchResultsList query={deferredQuery} onNavigate={navigate} />
                </Suspense>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
