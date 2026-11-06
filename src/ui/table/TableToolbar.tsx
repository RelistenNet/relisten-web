'use client';

import { usePathname, useRouter } from '@timber-js/app/client';
import { useEffect, useRef, useState } from 'react';
import { tableHref, type TableParams } from '@/ui/table/params';
import type { ToolbarFilter } from './types';

const SEARCH_DEBOUNCE_MS = 300;

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

  // Follow the URL (back/forward, "Clear"), but never while the user is typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setQuery(urlQuery);
  }, [urlQuery]);

  // Typing replaces the history entry rather than adding one per keystroke.
  useEffect(() => {
    if (query.trim() === urlQuery) return;
    const timer = setTimeout(() => {
      router.replace(tableHref(pathname, params, { q: query.trim() || undefined }), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, urlQuery, pathname, params, router]);

  const go = (patch: TableParams) =>
    router.push(tableHref(pathname, params, patch), { scroll: false });

  const hasActive = !!urlQuery || filters.some((f) => params[f.id]);

  return (
    // Without JS, the search box still works as a plain GET form.
    <form
      method="get"
      action={pathname}
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="search"
        name="q"
        aria-label="Search"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="
          min-w-0 flex-1 rounded-md border border-hairline bg-surface px-3 py-1.5 text-base
          text-text-primary placeholder:text-text-muted sm:max-w-xs sm:text-sm
        "
      />
      {filters.map((f) =>
        f.kind === 'select' ? (
          <select
            key={f.id}
            name={f.id}
            aria-label={f.label}
            value={(params[f.id] as string | undefined) ?? ''}
            onChange={(e) => go({ [f.id]: e.target.value || undefined })}
            className="
              rounded-md border border-hairline bg-surface px-2 py-1.5 text-base text-text-primary
              sm:text-sm
            "
          >
            <option value="">All {f.label.toLowerCase()}s</option>
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
      {hasActive && (
        <button
          type="button"
          onClick={() =>
            go(Object.fromEntries([['q', undefined], ...filters.map((f) => [f.id, undefined])]))
          }
          className="text-base text-accent hover:underline sm:text-sm"
        >
          Clear
        </button>
      )}
    </form>
  );
}
