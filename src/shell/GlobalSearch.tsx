'use client';

import {
  use,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from 'react';
import { useRouter } from '@timber-js/app/client';
import { ArrowRightIcon, SearchIcon } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/ui/base/shadcn/command';
import { Popover, PopoverTrigger, PopoverContent } from '@/ui/base/shadcn/popover';
import { HitText, KindIcon } from '@/ui/search/SearchHitParts';
import {
  EMPTY_SEARCH,
  MIN_QUERY_LENGTH,
  UNAVAILABLE_SEARCH,
  type SearchResults,
} from '@/lib/search';
import { searchSearchParams } from '@/lib/searchParams/apiSearchParams';
import { searchPageSearchParams } from '@/lib/searchParams/searchPageSearchParams';
import cn from '@/lib/cn';

// The nav bar's search (⌘K): typeahead over /api/search, the top matches
// across kinds, and a way through to the full /search page. The typed text is
// ephemeral UI; the full page keeps its query in the URL.

const DEBOUNCE_MS = 150;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_HITS = 8;

const resolvedEmpty = Promise.resolve(EMPTY_SEARCH);
// Recent queries, so backspacing doesn't refetch. Failures aren't kept.
const searchCache = new Map<string, Promise<SearchResults>>();

function fetchSearchResults(query: string): Promise<SearchResults> {
  const key = query.trim().toLowerCase();
  if (key.length < MIN_QUERY_LENGTH) return resolvedEmpty;

  let cached = searchCache.get(key);
  if (!cached) {
    if (searchCache.size >= 50) {
      const oldest = searchCache.keys().next().value;
      if (oldest !== undefined) searchCache.delete(oldest);
    }
    cached = fetch(searchSearchParams.href('/api/search', { q: key }), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Search responded ${res.status}`);
        return res.json() as Promise<SearchResults>;
      })
      .then((results) => {
        if (results.availability !== 'full') searchCache.delete(key);
        return results;
      })
      .catch(() => {
        searchCache.delete(key);
        return UNAVAILABLE_SEARCH;
      });
    searchCache.set(key, cached);
  }
  return cached;
}

function SearchResultsList({
  query,
  allResults,
  onNavigate,
}: {
  query: string;
  allResults: ReactNode;
  onNavigate: (href: string) => void;
}) {
  const results = use(fetchSearchResults(query));
  const hits = results.top.slice(0, MAX_HITS);

  return (
    <>
      {results.availability === 'unavailable' ? (
        <CommandEmpty>Search isn’t available right now.</CommandEmpty>
      ) : (
        hits.length === 0 && <p className="py-6 text-center text-sm text-text-muted">No matches.</p>
      )}
      {hits.length > 0 && (
        <CommandGroup heading={results.chips.length ? results.chips.join(' · ') : undefined}>
          {hits.map((hit) => (
            <CommandItem
              key={hit.id}
              value={hit.id}
              onSelect={() => onNavigate(hit.href)}
              className="min-h-11"
            >
              <KindIcon kind={hit.kind} />
              <HitText hit={hit} compact />
            </CommandItem>
          ))}
        </CommandGroup>
      )}
      {allResults}
    </>
  );
}

/** Through to the /search page for the typed query. */
function AllResultsItem({
  query,
  pending = false,
  onNavigate,
}: {
  query: string;
  /**
   * The row shown while results load. It needs its own value: if it shared
   * the loaded row's, cmdk would keep that value selected when results land
   * and scroll down to the last row instead of selecting the top hit.
   */
  pending?: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <CommandGroup>
      <CommandItem
        value={pending ? '__all-results-pending' : '__all-results'}
        onSelect={() => onNavigate(searchPageSearchParams.href('/search', { q: query }))}
        className="min-h-11 text-text-secondary"
      >
        <ArrowRightIcon aria-hidden className="size-4 text-text-muted" />
        <span className="truncate">All results for “{query}”</span>
      </CommandItem>
    </CommandGroup>
  );
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  // ⌘K / Ctrl+K anywhere opens and closes it.
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

  const reset = () => {
    clearTimeout(debounce.current);
    setInputValue('');
    setQuery('');
  };

  const navigate = (to: string) => {
    setOpen(false);
    reset();
    router.push(to);
  };

  const onValueChange = (value: string) => {
    setInputValue(value);
    clearTimeout(debounce.current);
    if (value.trim().length < MIN_QUERY_LENGTH) setQuery('');
    else debounce.current = setTimeout(() => setQuery(value), DEBOUNCE_MS);
  };

  const typed = inputValue.trim();
  const searchable = typed.length >= MIN_QUERY_LENGTH;
  const showResults = searchable && deferredQuery.trim().length >= MIN_QUERY_LENGTH;
  // The list on screen is for an older query than the box: fade it until the new one lands.
  const isStale = searchable && inputValue !== deferredQuery;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
      align="end"
      sideOffset={8}
    >
      <PopoverTrigger
        aria-label="Search"
        className="
          nav-btn cursor-pointer
          lg:mr-1 lg:h-8 lg:gap-2 lg:rounded-md lg:border lg:border-hairline lg:bg-surface-elevated
          lg:px-3 lg:text-xs lg:text-text-muted lg:hover:bg-surface-hover
        "
      >
        <SearchIcon aria-hidden className="size-4 lg:size-3.5" />
        <span className="hidden lg:inline">Search</span>
        <kbd
          className="
            pointer-events-none ml-1 hidden rounded border border-hairline bg-surface-raised
            px-1.5 py-0.5 font-mono text-[10px] text-text-muted
            lg:inline-block
          "
        >
          ⌘K
        </kbd>
      </PopoverTrigger>

      <PopoverContent
        // Below lg the trigger is an icon in from the edge, so an end-aligned panel
        // would run off the left of a phone: pin it to the viewport's right gutter.
        className="w-[min(420px,calc(100vw-1rem))] p-0 max-lg:right-2! max-lg:left-auto!"
        arrowClassName="hidden"
      >
        <Command shouldFilter={false} loop>
          <CommandInput
            placeholder="Artists, songs, venues, dates…"
            value={inputValue}
            onValueChange={onValueChange}
            autoFocus
          />
          <CommandList className="max-h-[min(24rem,60dvh)]">
            {!searchable ? (
              <CommandEmpty className="text-text-muted">Search all of Relisten.</CommandEmpty>
            ) : (
              // While the first results load, "All results" is the only item. It
              // lives in the fallback, so when hits arrive it unmounts and cmdk
              // moves the selection to the top hit (Enter opens it, and the list
              // doesn't scroll down to a selected last row).
              <Suspense
                fallback={
                  <>
                    <p className="py-6 text-center text-sm text-text-muted">Searching…</p>
                    <AllResultsItem query={typed} pending onNavigate={navigate} />
                  </>
                }
              >
                {showResults ? (
                  <div className={cn('transition-opacity duration-150', isStale && 'opacity-50')}>
                    <SearchResultsList
                      query={deferredQuery}
                      allResults={<AllResultsItem query={typed} onNavigate={navigate} />}
                      onNavigate={navigate}
                    />
                  </div>
                ) : (
                  <>
                    <p className="py-6 text-center text-sm text-text-muted">Searching…</p>
                    <AllResultsItem query={typed} pending onNavigate={navigate} />
                  </>
                )}
              </Suspense>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
