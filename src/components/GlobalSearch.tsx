'use client';

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
} from '@/components/ui/command';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { SearchIcon, MicIcon, MapPinIcon, RouteIcon } from 'lucide-react';
import { API_DOMAIN } from '@/lib/constants';
import cn from '@/lib/cn';

type SlimArtist = {
  name: string;
  slug: string;
  uuid: string;
  featured: number;
};

type SearchSong = {
  name: string;
  slug: string;
  shows_played_at: number;
  slim_artist: SlimArtist;
};

type SearchVenue = {
  name: string;
  slug: string;
  location: string;
  shows_at_venue: number;
  slim_artist: SlimArtist;
};

type SearchTour = {
  name: string;
  slug: string;
  shows_on_tour: number;
  slim_artist: SlimArtist;
};

type SearchResults = {
  Artists: SlimArtist[];
  Shows: any[];
  Songs: SearchSong[];
  Venues: SearchVenue[];
  Tours: SearchTour[];
};

const EMPTY: SearchResults = { Artists: [], Shows: [], Songs: [], Venues: [], Tours: [] };
const resolvedEmpty = Promise.resolve(EMPTY);
const searchCache = new Map<string, Promise<SearchResults>>();

function fetchSearchResults(query: string): Promise<SearchResults> {
  if (query.length < 2) return resolvedEmpty;

  let cached = searchCache.get(query);
  if (!cached) {
    if (searchCache.size > 50) {
      searchCache.delete(searchCache.keys().next().value!);
    }
    cached = fetch(`${API_DOMAIN}/api/v2/search?q=${encodeURIComponent(query)}`)
      .then((res) => (res.ok ? (res.json() as Promise<SearchResults>) : EMPTY))
      .catch(() => {
        searchCache.delete(query);
        return EMPTY;
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
    results.Artists.length > 0 ||
    results.Songs.length > 0 ||
    results.Venues.length > 0 ||
    results.Tours.length > 0;

  if (!hasResults) {
    return <CommandEmpty>No results found.</CommandEmpty>;
  }

  return (
    <>
      {results.Artists.length > 0 && (
        <CommandGroup heading="Artists">
          {results.Artists.slice(0, 8).map((artist) => (
            <CommandItem
              key={`artist-${artist.slug}`}
              value={`artist-${artist.slug}`}
              onSelect={() => onNavigate(`/${artist.slug}`)}
            >
              <MicIcon className="size-4 text-text-muted" />
              <span>{artist.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {results.Artists.length > 0 &&
        (results.Songs.length > 0 ||
          results.Venues.length > 0 ||
          results.Tours.length > 0) && <CommandSeparator />}

      {results.Songs.length > 0 && (
        <CommandGroup heading="Songs">
          {results.Songs.slice(0, 8).map((song) => (
            <CommandItem
              key={`song-${song.slim_artist.slug}-${song.slug}`}
              value={`song-${song.slim_artist.slug}-${song.slug}`}
              onSelect={() =>
                onNavigate(`/${song.slim_artist.slug}/songs?slug=${song.slug}`)
              }
            >
              <SearchIcon className="size-4 text-text-muted" />
              <div className="flex flex-col">
                <span>{song.name}</span>
                <span className="text-xs text-text-muted">
                  {song.slim_artist.name} · {song.shows_played_at} shows
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {results.Songs.length > 0 &&
        (results.Venues.length > 0 || results.Tours.length > 0) && (
          <CommandSeparator />
        )}

      {results.Venues.length > 0 && (
        <CommandGroup heading="Venues">
          {results.Venues.slice(0, 8).map((venue) => (
            <CommandItem
              key={`venue-${venue.slim_artist.slug}-${venue.slug}`}
              value={`venue-${venue.slim_artist.slug}-${venue.slug}`}
              onSelect={() =>
                onNavigate(`/${venue.slim_artist.slug}/venues?slug=${venue.slug}`)
              }
            >
              <MapPinIcon className="size-4 text-text-muted" />
              <div className="flex flex-col">
                <span>{venue.name}</span>
                <span className="text-xs text-text-muted">
                  {venue.slim_artist.name}
                  {venue.location ? ` · ${venue.location}` : ''}
                  {venue.shows_at_venue ? ` · ${venue.shows_at_venue} shows` : ''}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      )}

      {results.Venues.length > 0 && results.Tours.length > 0 && <CommandSeparator />}

      {results.Tours.length > 0 && (
        <CommandGroup heading="Tours">
          {results.Tours.slice(0, 6).map((tour) => (
            <CommandItem
              key={`tour-${tour.slim_artist.slug}-${tour.slug}`}
              value={`tour-${tour.slim_artist.slug}-${tour.slug}`}
              onSelect={() =>
                onNavigate(`/${tour.slim_artist.slug}/tours?slug=${tour.slug}`)
              }
            >
              <RouteIcon className="size-4 text-text-muted" />
              <div className="flex flex-col">
                <span>{tour.name}</span>
                <span className="text-xs text-text-muted">
                  {tour.slim_artist.name}
                  {tour.shows_on_tour ? ` · ${tour.shows_on_tour} shows` : ''}
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
    if (inputValue.length < 2) {
      setQuery(inputValue);
      return;
    }
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
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className="
          flex h-8 items-center gap-2 rounded-md border border-hairline bg-surface-elevated
          px-3 text-xs text-text-muted transition-colors hover:bg-surface-hover
          cursor-pointer
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

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(420px,calc(100vw-1rem))] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search artists, songs, venues..."
            value={inputValue}
            onValueChange={setInputValue}
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
              <div
                className={cn(
                  'transition-opacity duration-150',
                  isStale && 'opacity-50'
                )}
              >
                <Suspense
                  fallback={
                    <CommandEmpty className="text-text-muted">Searching...</CommandEmpty>
                  }
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
