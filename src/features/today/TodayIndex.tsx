'use client';

import cn from '@/lib/cn';
import { todayIndexSearchParams } from '@/lib/searchParams/todayIndexSearchParams';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link } from '@timber-js/app/client';

export type TodayIndexItem = {
  name: string;
  anchor: string;
  count: number;
  /** The table page the artist's shows start on, with `?anchor=`: the link when they aren't on this page. */
  href: string;
};

type SortMode = 'default' | 'alpha' | 'count';

const sortComparators: Record<SortMode, ((a: TodayIndexItem, b: TodayIndexItem) => number) | null> =
  {
    default: null,
    alpha: (a, b) => a.name.localeCompare(b.name),
    count: (a, b) => a.count - b.count || a.name.localeCompare(b.name),
  };

type TodayIndexProps = {
  items: TodayIndexItem[];
};

const TodayIndex = ({ items }: TodayIndexProps) => {
  const [{ order: sortMode, dir: sortDir, anchor: rawAnchor }, setParams] =
    todayIndexSearchParams.useQueryStates({ shallow: true, scroll: false });
  // The order goes through the server: the page's links (artists, pager, year
  // chart) are built there and keep it. The anchor stays shallow: just a scroll.
  const activeAnchor = rawAnchor ?? items[0]?.anchor;

  const toggleSort = (mode: SortMode) => {
    if (mode === 'default') {
      setParams({ order: 'default' }, { shallow: false });
    } else if (sortMode === mode) {
      setParams({ dir: sortDir === 'asc' ? 'desc' : 'asc' }, { shallow: false });
    } else {
      setParams({ order: mode, dir: 'asc' }, { shallow: false });
    }
  };

  const sortedItems = useMemo(() => {
    const comparator = sortComparators[sortMode];
    if (!comparator) return items;
    const sorted = [...items].sort(comparator);
    return sortDir === 'asc' ? sorted : sorted.reverse();
  }, [items, sortMode, sortDir]);

  // The artist in the URL, scrolled to: on load, after the index switches
  // table pages, and after a click on this page.
  useEffect(() => {
    if (!rawAnchor) return;
    document.getElementById(rawAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [rawAnchor]);

  return (
    <nav className="sticky top-4 hidden max-h-[calc(100vh-2rem)] w-48 shrink-0 flex-col self-start md:flex">
      <div className="mb-2">
        <p className="mb-1 text-[11px] font-semibold tracking-wide text-column-subheader-text uppercase">
          Artists
        </p>
        <div className="flex gap-1">
          {(
            [
              ['default', 'Default'],
              ['alpha', 'A–Z'],
              ['count', '# Shows'],
            ] as const
          ).map(([mode, label]) => {
            const isActive = sortMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => toggleSort(mode)}
                title={label}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded p-1 text-[10px] transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  isActive
                    ? 'bg-accent/10 font-medium text-accent ring-1 ring-accent/40 hover:bg-accent/15'
                    : `
                      bg-column-header-text/5 text-column-header-text/70
                      hover:bg-column-header-text/10 hover:text-column-header-text
                    `
                )}
              >
                {isActive && mode !== 'default' ? (
                  sortDir === 'asc' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )
                ) : null}
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <ul className="min-h-0 flex-1 list-none space-y-1 overflow-y-auto pr-2 text-sm">
        {sortedItems.map(({ name, anchor, count, href }) => {
          const isActive = anchor === activeAnchor;
          return (
            <li key={anchor} className="ml-0 list-none">
              <Link
                href={href}
                scroll={false}
                onClick={(e) => {
                  // A new tab or window: the link as it is.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  // On this page: scroll there (even to the one already active), keeping the page.
                  const target = document.getElementById(anchor);
                  if (!target) return;
                  e.preventDefault();
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setParams({ anchor });
                }}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 transition-colors ${
                  isActive
                    ? 'bg-surface-hover font-medium text-text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <span className="truncate">{name}</span>
                <span className="text-xxs text-text-muted">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default TodayIndex;
