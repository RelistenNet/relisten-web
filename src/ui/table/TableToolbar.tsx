'use client';

import { usePendingNavigation } from '@timber-js/app/client';
import { debounce } from '@timber-js/app/search-params';
import { SearchIcon, XIcon } from 'lucide-react';
import type { CSSProperties } from 'react';
import { definitionFor, type TableParams } from '@/ui/table/params';
import cn from '@/lib/cn';
import type { ToolbarFilter } from './types';

// The table's search box and filters. The URL is their only state: the box
// and controls read it through useQueryStates, typing writes it (debounced,
// so one server request per pause), and Back/Forward simply change it. The
// search status is derived from three values: the text, the query the server
// last rendered (`params.q`), and where a pending navigation is headed.

const SEARCH_DEBOUNCE_MS = 300;

/** "year" → "years", "country" → "countries". */
const plural = (word: string) => (/[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`);

/**
 * Search progress, shown by one ring on the right of the input: waiting out
 * the debounce (a muted ring), searching (an accent arc, spinning), idle. Going
 * from searching to idle closes the arc, draws a check, and fades (CSS only).
 */
type SearchStatus = 'idle' | 'waiting' | 'searching';

// Focus: a faint accent border and ring instead of the browser outline.
const FIELD = `
  rounded-md border border-hairline bg-surface py-1.5 text-base text-text-primary outline-none
  transition-[border-color,box-shadow] focus:border-accent/40 focus:ring-2 focus:ring-accent/10
  sm:text-sm
`;

type Props = {
  /** The params the server rendered this table with. */
  params: TableParams;
  filters: ToolbarFilter[];
  searchPlaceholder: string;
};

export default function TableToolbar({ params, filters, searchPlaceholder }: Props) {
  const definition = definitionFor(filters.map((f) => f.id));
  const [url, setParams] = definition.useQueryStates({ scroll: false });

  const text = url.q ?? '';
  const rendered = ((params.q as string | undefined) ?? '').trim();
  // A navigation in flight to this page with a different search: the results are coming.
  const searching = usePendingNavigation(
    (to, from) =>
      to.pathname === from.pathname && (to.searchParams.get('q') ?? '').trim() !== rendered
  );
  const status: SearchStatus = searching
    ? 'searching'
    : text.trim() !== rendered
      ? 'waiting'
      : 'idle';

  // Any change but paging goes back to page 1.
  const setFilter = (patch: TableParams) =>
    setParams({ ...patch, page: undefined }, { history: 'push' });

  return (
    // Without JS, the search box still works as a plain GET form.
    <form
      method="get"
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="relative min-w-0 basis-full sm:max-w-xs sm:flex-1 sm:basis-0">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
        />
        <input
          type="search"
          name="q"
          aria-label="Search"
          autoComplete="off"
          placeholder={searchPlaceholder}
          value={text}
          onChange={(e) =>
            setParams(
              { q: e.target.value || undefined, page: undefined },
              { history: 'replace', limitUrlUpdates: debounce(SEARCH_DEBOUNCE_MS) }
            )
          }
          // The browser's clear button is replaced by ours, which shares the ring's spot.
          className={cn(
            FIELD,
            'w-full pr-9 pl-9 placeholder:text-text-muted',
            '[&::-webkit-search-cancel-button]:appearance-none'
          )}
        />
        <button
          type="button"
          aria-label="Clear search"
          onClick={(e) => {
            setParams({ q: undefined, page: undefined }, { history: 'replace' });
            e.currentTarget.form?.querySelector('input')?.focus();
          }}
          className={cn(
            'absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center',
            'rounded-sm text-text-muted transition-opacity hover:text-text-primary',
            // It shares the ring's spot: hide at once while the ring shows, and
            // come back only after the ring's check has faded (see RING_STYLE.idle).
            status === 'idle' && text
              ? 'opacity-100 delay-1350 duration-300'
              : 'pointer-events-none opacity-0 duration-150'
          )}
        >
          <XIcon aria-hidden className="size-4" />
        </button>
        <SearchRing status={status} />
        <span role="status" className="sr-only">
          {status === 'searching' ? 'Searching' : ''}
        </span>
      </div>
      {filters.map((f) => {
        const value = url[f.id] as string | undefined;
        if (f.kind === 'chip') {
          return value ? (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter({ [f.id]: undefined })}
              aria-label={`Remove ${f.label.toLowerCase()} filter: ${f.valueLabel ?? value}`}
              className="
                flex items-center gap-1 rounded-full bg-accent/15 py-1 pr-2 pl-3 text-base
                text-text-primary outline-none hover:bg-accent/25 focus-visible:ring-3
                focus-visible:ring-accent/30 sm:text-sm
              "
            >
              {f.valueLabel ?? value}
              <XIcon aria-hidden className="size-4 text-text-muted" />
            </button>
          ) : null;
        }
        if (f.kind === 'select') {
          return (
            <select
              key={f.id}
              name={f.id}
              aria-label={f.label}
              value={value ?? ''}
              onChange={(e) => setFilter({ [f.id]: e.target.value || undefined })}
              className={cn(FIELD, 'px-2')}
            >
              <option value="">All {plural(f.label.toLowerCase())}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({o.count})
                </option>
              ))}
            </select>
          );
        }
        return (
          <label
            key={f.id}
            className="flex items-center gap-2 text-base text-text-primary sm:text-sm"
          >
            <input
              type="checkbox"
              name={f.id}
              value="1"
              checked={value === '1'}
              onChange={(e) => setFilter({ [f.id]: e.target.checked ? '1' : undefined })}
              className="size-5 sm:size-4"
            />
            {f.label}
          </label>
        );
      })}
    </form>
  );
}

// One SVG for every status, so each change is a transition of the same shapes
// rather than a swap. The ring spins whenever it shows: a full circle looks the
// same at any angle, so the spin only reads once it opens into an arc. "Done"
// is the searching → idle transition: idle's styles close the ring and draw the
// check, and fade the whole thing after a pause. A page that loads idle has no
// transition to run, so nothing shows.
const RING_STYLE: Record<
  SearchStatus,
  { ring: CSSProperties; check: CSSProperties; box: CSSProperties }
> = {
  idle: {
    box: { opacity: 0, transition: 'opacity 500ms ease-in-out 850ms' },
    ring: { strokeDasharray: '1 0', transition: 'stroke-dasharray 300ms ease-out, color 300ms' },
    check: { strokeDashoffset: 0, transition: 'stroke-dashoffset 300ms ease-out 250ms' },
  },
  waiting: {
    box: { opacity: 1, transition: 'opacity 300ms ease-out' },
    ring: { strokeDasharray: '1 0', transition: 'stroke-dasharray 500ms ease-in-out, color 300ms' },
    check: { strokeDashoffset: 1, transition: 'none' },
  },
  searching: {
    box: { opacity: 1, transition: 'opacity 300ms ease-out' },
    ring: {
      strokeDasharray: '0.7 0.3',
      transition: 'stroke-dasharray 500ms ease-in-out, color 300ms',
    },
    check: { strokeDashoffset: 1, transition: 'none' },
  },
};

function SearchRing({ status }: { status: SearchStatus }) {
  const style = RING_STYLE[status];
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      style={style.box}
    >
      <svg viewBox="0 0 16 16" className="size-4">
        <circle
          cx="8"
          cy="8"
          r="6.5"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          pathLength={1}
          className={cn(
            'origin-center animate-[spin_1.4s_linear_infinite] stroke-current',
            'transform-fill motion-reduce:animate-none',
            status === 'waiting' ? 'text-text-muted' : 'text-accent'
          )}
          style={style.ring}
        />
        <path
          d="M5.25 8.25l1.9 1.9 3.6-3.9"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1"
          className="stroke-accent"
          style={style.check}
        />
      </svg>
    </span>
  );
}
