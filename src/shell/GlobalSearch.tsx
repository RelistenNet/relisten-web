'use client';

import { Suspense, use, useDeferredValue, useEffect, useState } from 'react';
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
import { MIN_QUERY_LENGTH, UNAVAILABLE_SEARCH, type SearchResults } from '@/lib/search';
import { searchSearchParams } from '@/lib/searchParams/apiSearchParams';
import { searchPageSearchParams } from '@/lib/searchParams/searchPageSearchParams';
import cn from '@/lib/cn';

// The nav bar's search (⌘K): typeahead over /api/search, the top matches
// across kinds, and a way through to the full /search page.
//
// React does the scheduling. The box updates on every keystroke; the results
// render from `useDeferredValue(query)`, which suspends on that query's
// request (`use`), keeps the previous results on screen meanwhile, and drops
// renders the user has typed past. Each query's request is cached, so a
// re-render or a backspace reuses it.

const FETCH_TIMEOUT_MS = 6_000;
const MAX_HITS = 8;

const requests = new Map<string, Promise<SearchResults>>();

/** One request per query, shared by every render that asks for it. Failures aren't kept. */
function searchRequest(query: string): Promise<SearchResults> {
  let request = requests.get(query);
  if (!request) {
    request = fetch(searchSearchParams.href('/api/search', { q: query }), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
      .then((res) => (res.ok ? (res.json() as Promise<SearchResults>) : UNAVAILABLE_SEARCH))
      .catch(() => UNAVAILABLE_SEARCH)
      .then((results) => {
        if (results.availability !== 'full') requests.delete(query);
        return results;
      });
    requests.set(query, request);
  }
  return request;
}

const normalize = (query: string) => query.trim().toLowerCase();

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);

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

  return (
    <Popover open={open} onOpenChange={setOpen} align="end" sideOffset={8}>
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
        {/* Mounted only while open, so closing clears the query. */}
        <SearchPanel onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function SearchPanel({ onNavigate }: { onNavigate: () => void }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  // The highlighted row belongs to the results it was chosen in. New results
  // start with none, and cmdk highlights their first row.
  const [selection, setSelection] = useState({ query: '', value: '' });
  const router = useRouter();

  const navigate = (to: string) => {
    onNavigate();
    router.push(to);
  };

  const typed = query.trim();
  const deferred = normalize(deferredQuery);
  const allResults = searchPageSearchParams.href('/search', { q: typed });
  const selected = selection.query === deferred ? selection.value : '';

  return (
    <Command
      shouldFilter={false}
      loop
      value={selected}
      onValueChange={(value) => setSelection({ query: deferred, value })}
      onKeyDown={(e) => {
        // Enter before any results: the full results page.
        if (e.key === 'Enter' && !selected && typed.length >= MIN_QUERY_LENGTH)
          navigate(allResults);
      }}
    >
      <CommandInput
        placeholder="Artists, songs, venues, dates…"
        value={query}
        onValueChange={setQuery}
        autoFocus
      />
      <CommandList className="max-h-[min(24rem,60dvh)]">
        {typed.length < MIN_QUERY_LENGTH ? (
          <CommandEmpty className="text-text-muted">Search all of Relisten.</CommandEmpty>
        ) : deferred.length < MIN_QUERY_LENGTH ? (
          <Message>Searching…</Message>
        ) : (
          <Suspense fallback={<Message>Searching…</Message>}>
            {/* Older results than the box: faded until the new ones render. */}
            <div
              className={cn(
                'transition-opacity duration-150',
                query !== deferredQuery && 'opacity-50'
              )}
            >
              {/* A new result set is new rows, so cmdk highlights its first. */}
              <Results key={deferred} query={deferred} onSelect={navigate} />
              <AllResultsItem query={typed} href={allResults} onSelect={navigate} />
            </div>
          </Suspense>
        )}
      </CommandList>
    </Command>
  );
}

function Results({ query, onSelect }: { query: string; onSelect: (href: string) => void }) {
  const results = use(searchRequest(query));
  const hits = results.top.slice(0, MAX_HITS);

  if (results.availability === 'unavailable') {
    return <Message>Search isn’t available right now.</Message>;
  }
  if (!hits.length) return <Message>No matches.</Message>;
  return (
    <CommandGroup heading={results.chips.length ? results.chips.join(' · ') : undefined}>
      {hits.map((hit) => (
        <CommandItem
          key={hit.id}
          value={hit.id}
          onSelect={() => onSelect(hit.href)}
          className="min-h-11"
        >
          <KindIcon kind={hit.kind} />
          <HitText hit={hit} compact />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function AllResultsItem({
  query,
  href,
  onSelect,
}: {
  query: string;
  href: string;
  onSelect: (href: string) => void;
}) {
  return (
    <CommandGroup>
      <CommandItem
        value="__all-results"
        onSelect={() => onSelect(href)}
        className="min-h-11 text-text-secondary"
      >
        <ArrowRightIcon aria-hidden className="size-4 text-text-muted" />
        <span className="truncate">All results for “{query}”</span>
      </CommandItem>
    </CommandGroup>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-text-muted">{children}</p>;
}
