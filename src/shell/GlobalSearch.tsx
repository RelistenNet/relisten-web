'use client';

import { Suspense, use, useEffect, useState, useTransition } from 'react';
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
// The box updates on every keystroke. Once typing pauses
// (REQUEST_DEBOUNCE_MS), a transition starts that query's
// request and puts its promise in state; the results read it with `use`.
// While it loads, the transition keeps the previous results on screen; they
// stay faded from the keystroke until the new ones render. A backspace to an earlier query refetches, which
// the browser answers from its HTTP cache (/api/search is cacheable).

const REQUEST_DEBOUNCE_MS = 180;
const FETCH_TIMEOUT_MS = 6_000;
const MAX_HITS = 8;

type SearchRequest = { query: string; results: Promise<SearchResults> };

function fetchSearch(query: string): Promise<SearchResults> {
  return fetch(searchSearchParams.href('/api/search', { q: query }), {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
    .then((res) => (res.ok ? (res.json() as Promise<SearchResults>) : UNAVAILABLE_SEARCH))
    .catch(() => UNAVAILABLE_SEARCH);
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
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const [isPending, startTransition] = useTransition();
  // The highlighted row belongs to the results it was chosen in. New results
  // start with none, and cmdk highlights their first row.
  const [selection, setSelection] = useState({ query: '', value: '' });
  const router = useRouter();

  const typed = query.trim();

  // Request the query once typing pauses: any keystroke, a space too, restarts the wait.
  useEffect(() => {
    const q = normalize(query);
    if (q.length < MIN_QUERY_LENGTH) return;
    const timer = setTimeout(() => {
      startTransition(() => setRequest({ query: q, results: fetchSearch(q) }));
    }, REQUEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const navigate = (to: string) => {
    onNavigate();
    router.push(to);
  };

  const allResults = searchPageSearchParams.href('/search', { q: typed });
  const selected = request && selection.query === request.query ? selection.value : '';

  return (
    <Command
      shouldFilter={false}
      loop
      value={selected}
      onValueChange={(value) => request && setSelection({ query: request.query, value })}
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
        ) : !request ? (
          <Message>Searching…</Message>
        ) : (
          <Suspense fallback={<Message>Searching…</Message>}>
            {/* Not the box's results: faded while typing pauses and while the new request loads. */}
            <div
              className={cn(
                'transition-opacity duration-150',
                (isPending || request.query !== normalize(query)) && 'opacity-50'
              )}
            >
              {/* A new result set is new rows, so cmdk highlights its first. */}
              <Results key={request.query} results={request.results} onSelect={navigate} />
              <AllResultsItem query={typed} href={allResults} onSelect={navigate} />
            </div>
          </Suspense>
        )}
      </CommandList>
    </Command>
  );
}

function Results({
  results: request,
  onSelect,
}: {
  results: Promise<SearchResults>;
  onSelect: (href: string) => void;
}) {
  const results = use(request);
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
