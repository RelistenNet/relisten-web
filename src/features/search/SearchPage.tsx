import { Link } from '@timber-js/app/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { search } from '@/data/search';
import {
  MIN_QUERY_LENGTH,
  SCOPE_LABEL,
  SEARCH_SCOPES,
  type ResultScope,
  type SearchHit,
  type SearchResults,
  type SearchScope,
} from '@/lib/search';
import { searchPageSearchParams } from '@/lib/searchParams/searchPageSearchParams';
import { numberFormat } from '@/lib/utils';
import cn from '@/lib/cn';
import TablePending from '@/ui/table/TablePending';
import SearchBox from './SearchBox';
import { HitText, KindIcon } from '@/ui/search/SearchHitParts';

// /search: the whole catalog. All shows the ranked top matches, then the
// recordings and reviews the ranking leaves out; a scope shows one kind,
// paged. Rendered on the server with its results; the box only changes the URL.

const SECTION_PREVIEW = 5;
const EXAMPLES = ['Cornell 77', 'Japan Twist', 'Barton Hall', 'billy red rocks creek'];

const searchHref = (q: string, scope: SearchScope = 'all', page = 1) =>
  searchPageSearchParams.href('/search', { q, scope, page });

export default async function SearchPage() {
  const { q, scope, page } = await searchPageSearchParams.get();
  const searched = q.length >= MIN_QUERY_LENGTH;
  const results = searched ? await search(q, { scope, page }) : undefined;

  return (
    <div className="detail-page flex flex-col gap-5">
      <h1 className="sr-only">Search</h1>
      <SearchBox rendered={q} />
      {results && <ScopeTabs q={q} scope={scope} counts={results.counts} />}
      <TablePending className="flex flex-col gap-8">
        {!results ? (
          <Examples />
        ) : results.availability === 'unavailable' ? (
          <Notice>Search isn’t available right now. Try again in a moment.</Notice>
        ) : (
          <Results q={q} scope={scope} page={page} results={results} />
        )}
      </TablePending>
    </div>
  );
}

export function searchMetadata() {
  return { title: 'Search', robots: { index: false } };
}

function ScopeTabs({
  q,
  scope,
  counts,
}: {
  q: string;
  scope: SearchScope;
  counts: SearchResults['counts'];
}) {
  return (
    // Scrolls sideways on a phone rather than wrapping, so the results never move down.
    <nav aria-label="Result type" className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4">
      <div className="inline-flex gap-1 rounded-md border border-hairline bg-surface-recessed p-0.5">
        {SEARCH_SCOPES.map((s) => {
          const count = s === 'all' ? undefined : counts[s];
          const current = s === scope;
          return (
            <Link
              key={s}
              href={searchHref(q, s)}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'flex min-h-9 items-center gap-1.5 rounded-sm px-3 text-sm whitespace-nowrap transition-colors',
                current
                  ? 'bg-surface-raised font-medium text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {SCOPE_LABEL[s]}
              {count !== undefined && (
                <span className="text-xs text-text-muted tabular-nums">
                  {numberFormat.format(count)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Results({
  q,
  scope,
  page,
  results,
}: {
  q: string;
  scope: SearchScope;
  page: number;
  results: SearchResults;
}) {
  const chips = results.chips.length > 0 && (
    <p className="mb-0 text-sm text-text-muted">
      Filtered to <span className="text-text-secondary">{results.chips.join(' · ')}</span>
    </p>
  );

  if (scope !== 'all') {
    if (!results.results.length) {
      return (
        <>
          {chips}
          <Notice>
            {page > 1 ? 'No more results.' : `No ${SCOPE_LABEL[scope].toLowerCase()} match “${q}”.`}
          </Notice>
          {page > 1 && <Pager q={q} scope={scope} page={page} hasNext={false} />}
        </>
      );
    }
    return (
      <>
        {chips}
        <HitList hits={results.results} />
        {/* Page sizes vary by kind and some counts are lower bounds, so: previous and next. */}
        <Pager q={q} scope={scope} page={page} hasNext={page < 100 && !!results.nextPage} />
      </>
    );
  }

  const sections: { scope: ResultScope; title: string; hits: SearchHit[]; count?: number }[] = [
    {
      scope: 'sources',
      title: 'Recordings',
      hits: results.recordings,
      count: results.counts.sources,
    },
    {
      scope: 'reviews',
      title: 'Notes & Reviews',
      hits: results.reviews,
      count: results.counts.reviews,
    },
  ];
  const empty = !results.top.length && sections.every((s) => !s.hits.length);
  if (empty) {
    return (
      <>
        {chips}
        <Notice>Nothing matches “{q}”.</Notice>
      </>
    );
  }

  return (
    <>
      {chips}
      {results.top.length > 0 && (
        <section aria-labelledby="top-results" className="flex flex-col gap-2">
          <h2 id="top-results" className="mb-0 text-sm font-semibold text-text-secondary">
            Top Results
          </h2>
          <HitList hits={results.top} />
        </section>
      )}
      {sections.map(
        (s) =>
          s.hits.length > 0 && (
            <section
              key={s.scope}
              aria-labelledby={`${s.scope}-results`}
              className="flex flex-col gap-2"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2
                  id={`${s.scope}-results`}
                  className="mb-0 text-sm font-semibold text-text-secondary"
                >
                  {s.title}
                </h2>
                <Link
                  href={searchHref(q, s.scope)}
                  className="text-sm text-text-muted hover:text-text-primary"
                >
                  See all
                  {s.count !== undefined && ` ${numberFormat.format(s.count)}`}
                </Link>
              </div>
              <HitList hits={s.hits.slice(0, SECTION_PREVIEW)} />
            </section>
          )
      )}
    </>
  );
}

function HitList({ hits }: { hits: SearchHit[] }) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-hairline rounded-lg border border-hairline p-0">
      {hits.map((hit) => (
        <li key={hit.id} className="m-0 list-none">
          <Link
            href={hit.href}
            className="flex min-h-14 items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-hover"
          >
            <KindIcon kind={hit.kind} />
            <HitText hit={hit} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Pager({
  q,
  scope,
  page,
  hasNext,
}: {
  q: string;
  scope: SearchScope;
  page: number;
  hasNext: boolean;
}) {
  const button =
    'flex h-9 items-center gap-1 rounded-md border border-hairline px-3 text-sm text-text-secondary';
  const off = 'pointer-events-none opacity-40';
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-4">
      {/* Both always rendered, so the bar never shifts. */}
      <Link
        href={searchHref(q, scope, Math.max(1, page - 1))}
        aria-disabled={page <= 1 || undefined}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn(button, 'hover:text-text-primary', page <= 1 && off)}
      >
        <ChevronLeft aria-hidden className="size-4" />
        Previous
      </Link>
      <span className="text-sm text-text-muted tabular-nums">Page {page}</span>
      <Link
        href={searchHref(q, scope, page + 1)}
        aria-disabled={!hasNext || undefined}
        tabIndex={!hasNext ? -1 : undefined}
        className={cn(button, 'hover:text-text-primary', !hasNext && off)}
      >
        Next
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </nav>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="mb-0 py-8 text-center text-text-muted">{children}</p>;
}

function Examples() {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="mb-0 text-text-muted">
        Search every artist, song, venue, show, recording, review and playlist on Relisten.
      </p>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
        {EXAMPLES.map((example) => (
          <li key={example} className="m-0 list-none">
            <Link
              href={searchHref(example)}
              className="
                flex min-h-9 items-center rounded-full border border-hairline px-3 text-sm
                text-text-secondary hover:bg-surface-hover hover:text-text-primary
              "
            >
              {example}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
