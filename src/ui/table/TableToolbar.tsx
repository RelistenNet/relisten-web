'use client';

import { usePathname, useRouter } from '@timber-js/app/client';
import { SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { tableHref, type TableParams } from '@/ui/table/params';
import cn from '@/lib/cn';
import { useMarkOwnNavigation, useMarkStale } from './TablePending';
import type { ToolbarFilter } from './types';

const SEARCH_DEBOUNCE_MS = 300;

/** "year" → "years", "country" → "countries". */
const plural = (word: string) => (/[^aeiou]y$/.test(word) ? `${word.slice(0, -1)}ies` : `${word}s`);
/** How long "done" lasts: the check draws, holds, and fades out. */
const DONE_MS = 1400;

/**
 * Search progress, shown by one ring on the right of the input: waiting out
 * the debounce (a muted ring), searching (an accent arc, spinning), done (the
 * arc closes, a check draws inside, then it all fades).
 */
type SearchStatus = 'idle' | 'waiting' | 'searching' | 'done';

// Focus: a faint accent border and ring instead of the browser outline.
const FIELD = `
  rounded-md border border-hairline bg-surface py-1.5 text-base text-text-primary outline-none
  transition-[border-color,box-shadow] focus:border-accent/40 focus:ring-2 focus:ring-accent/10
  sm:text-sm
`;

type Props = {
  params: TableParams;
  filters: ToolbarFilter[];
  searchPlaceholder: string;
};

export default function TableToolbar({ params, filters, searchPlaceholder }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const urlQuery = (params.q as string | undefined) ?? '';
  const [query, setQuery] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  // The query sent to the server and not yet reflected in the URL.
  const [sent, setSent] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const trimmed = query.trim();

  // Follow the URL (back/forward, "Clear"), but never while the user is typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setQuery(urlQuery);
  }, [urlQuery]);

  // Typing replaces the history entry rather than adding one per keystroke.
  useEffect(() => {
    if (trimmed === urlQuery) return;
    const timer = setTimeout(() => {
      setSent(trimmed);
      setDone(false);
      router.replace(tableHref(pathname, params, { q: trimmed || undefined }), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, urlQuery, pathname, params, router]);

  // The server rendered the sent query (its params now carry it): results are
  // in. Adjusted during render, as React recommends for state that follows props.
  if (sent !== null && urlQuery === sent) {
    setSent(null);
    // Still typing past it: stay busy rather than finishing.
    setDone(trimmed === sent);
  }

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), DONE_MS);
    return () => clearTimeout(timer);
  }, [done]);

  // A search in flight stays "searching" even if typing continues, so the arc
  // never steps back to the waiting ring mid-request.
  const status: SearchStatus =
    sent !== null ? 'searching' : trimmed !== urlQuery ? 'waiting' : done ? 'done' : 'idle';
  // The rows on screen don't match the query until its results render.
  useMarkStale(status === 'waiting' || status === 'searching');

  const markOwnNavigation = useMarkOwnNavigation();
  const go = (patch: TableParams) => {
    markOwnNavigation?.();
    router.push(tableHref(pathname, params, patch), { scroll: false });
  };

  return (
    // Without JS, the search box still works as a plain GET form.
    <form
      method="get"
      action={pathname}
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="relative min-w-0 basis-full sm:max-w-xs sm:flex-1 sm:basis-0">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
        />
        <input
          ref={inputRef}
          type="search"
          name="q"
          aria-label="Search"
          autoComplete="off"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          className={cn(
            'absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center',
            'rounded-sm text-text-muted transition-opacity duration-300 hover:text-text-primary',
            status === 'idle' && query ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          <XIcon aria-hidden className="size-4" />
        </button>
        <SearchRing status={status} />
        <span role="status" className="sr-only">
          {status === 'searching' ? 'Searching' : status === 'done' ? 'Results updated' : ''}
        </span>
      </div>
      {filters.map((f) =>
        f.kind === 'chip' ? (
          params[f.id] ? (
            <button
              key={f.id}
              type="button"
              onClick={() => go({ [f.id]: undefined })}
              aria-label={`Remove ${f.label.toLowerCase()} filter: ${f.valueLabel ?? params[f.id]}`}
              className="
                flex items-center gap-1 rounded-full bg-accent/15 py-1 pr-2 pl-3 text-base
                text-text-primary outline-none hover:bg-accent/25 focus-visible:ring-3
                focus-visible:ring-accent/30 sm:text-sm
              "
            >
              {f.valueLabel ?? String(params[f.id])}
              <XIcon aria-hidden className="size-4 text-text-muted" />
            </button>
          ) : null
        ) : f.kind === 'select' ? (
          <select
            key={f.id}
            name={f.id}
            aria-label={f.label}
            value={(params[f.id] as string | undefined) ?? ''}
            onChange={(e) => go({ [f.id]: e.target.value || undefined })}
            className={cn(FIELD, 'px-2')}
          >
            <option value="">All {plural(f.label.toLowerCase())}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} ({o.count})
              </option>
            ))}
          </select>
        ) : (
          <label
            key={f.id}
            className="flex items-center gap-2 text-base text-text-primary sm:text-sm"
          >
            <input
              type="checkbox"
              name={f.id}
              value="1"
              checked={params[f.id] === '1'}
              onChange={(e) => go({ [f.id]: e.target.checked ? '1' : undefined })}
              className="size-5 sm:size-4"
            />
            {f.label}
          </label>
        )
      )}
    </form>
  );
}

// One SVG for every status, so each change is a transition of the same shapes
// rather than a swap. The ring spins whenever it shows: a full circle looks the
// same at any angle, so the spin only reads once it opens into an arc, and
// starting or stopping it never snaps.
const RING_STYLE: Record<
  SearchStatus,
  { ring: CSSProperties; check: CSSProperties; box: CSSProperties }
> = {
  idle: {
    box: { opacity: 0, transition: 'opacity 500ms ease-in-out' },
    ring: { strokeDasharray: '1 0' },
    check: { strokeDashoffset: 1, transition: 'none' },
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
  done: {
    // Close the ring, draw the check, hold, then fade.
    box: { opacity: 0, transition: 'opacity 500ms ease-in-out 850ms' },
    ring: { strokeDasharray: '1 0', transition: 'stroke-dasharray 300ms ease-out, color 300ms' },
    check: { strokeDashoffset: 0, transition: 'stroke-dashoffset 300ms ease-out 250ms' },
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
            '[transform-box:fill-box] motion-reduce:animate-none',
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
