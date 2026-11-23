'use client';

import { usePendingNavigation } from '@timber-js/app/client';
import { debounce } from '@timber-js/app/search-params';
import { SearchIcon } from 'lucide-react';
import { searchPageSearchParams } from '@/lib/searchParams/searchPageSearchParams';
import { SearchRing, type SearchStatus } from '@/ui/table/TableToolbar';
import cn from '@/lib/cn';

// /search's query box. The URL is its only state, as in the table toolbar:
// typing writes `q` (debounced, one server render per pause), Back/Forward
// change it, and the status ring is derived from the text, the query the
// server rendered, and where a pending navigation is headed.

const SEARCH_DEBOUNCE_MS = 300;

export default function SearchBox({ rendered }: { rendered: string }) {
  const [url, setParams] = searchPageSearchParams.useQueryStates({ scroll: false });
  const text = url.q;
  const searching = usePendingNavigation(
    (to, from) =>
      to.pathname === from.pathname && (to.searchParams.get('q') ?? '').trim() !== rendered
  );
  const status: SearchStatus = searching
    ? 'searching'
    : text.trim() !== rendered
      ? 'waiting'
      : 'idle';

  return (
    // Without JS, a plain GET form. The scope stays; a new query starts at page 1.
    <form method="get" role="search" onSubmit={(e) => e.preventDefault()} className="relative">
      {url.scope !== 'all' && <input type="hidden" name="scope" value={url.scope} />}
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-text-muted"
      />
      <input
        type="search"
        name="q"
        aria-label="Search Relisten"
        autoComplete="off"
        enterKeyHint="search"
        // Only on an empty page: with a query, focusing would raise the phone keyboard over the results.
        autoFocus={!rendered}
        placeholder="Artists, songs, venues, dates, tapers…"
        value={text}
        onChange={(e) =>
          setParams(
            { q: e.target.value, page: undefined },
            { history: 'replace', limitUrlUpdates: debounce(SEARCH_DEBOUNCE_MS) }
          )
        }
        className={cn(
          'h-12 w-full rounded-lg border border-hairline bg-surface pr-10 pl-11 text-base text-text-primary',
          'outline-none placeholder:text-text-muted',
          'transition-[border-color,box-shadow] focus:border-accent/40 focus:ring-2 focus:ring-accent/10',
          '[&::-webkit-search-cancel-button]:appearance-none'
        )}
      />
      <SearchRing status={status} />
      <span role="status" className="sr-only">
        {status === 'searching' ? 'Searching' : ''}
      </span>
    </form>
  );
}
