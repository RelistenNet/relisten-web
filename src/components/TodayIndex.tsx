'use client';

import cn from '@/lib/cn';
import { todayIndexSearchParams } from '@/lib/searchParams/todayIndexSearchParams';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useMemo } from 'react';

export type TodayIndexItem = {
  name: string;
  anchor: string;
  count: number;
};

type SortMode = 'default' | 'alpha' | 'count';

const TodayIndex = ({ items }: { items: TodayIndexItem[] }) => {
  const [{ sort: sortMode, dir: sortDir, anchor: rawAnchor }, setParams] =
    todayIndexSearchParams.useQueryStates({ shallow: true, scroll: false });
  const activeAnchor = rawAnchor ?? items[0]?.anchor;

  const toggleSort = (mode: SortMode) => {
    if (mode === 'default') return;
    if (sortMode === mode) {
      setParams({ dir: sortDir === 'asc' ? 'desc' : 'asc' });
    } else {
      setParams({ sort: mode, dir: 'asc' });
    }
  };

  const sortedItems = useMemo(() => {
    if (sortMode === 'alpha') {
      const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
      return sortDir === 'asc' ? sorted : sorted.reverse();
    }
    if (sortMode === 'count') {
      const sorted = [...items].sort(
        (a, b) => a.count - b.count || a.name.localeCompare(b.name)
      );
      return sortDir === 'asc' ? sorted : sorted.reverse();
    }
    return items;
  }, [items, sortMode, sortDir]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setParams({ anchor: visible[0].target.id }, { history: 'replace' });
        }
      },
      { rootMargin: '-64px 0px -70% 0px', threshold: 0 }
    );

    items.forEach(({ anchor }) => {
      const el = document.getElementById(anchor);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items, setParams]);

  return (
    <nav className="sticky top-4 hidden w-48 shrink-0 self-start md:block">
      <div className="mb-2">
        <p className="mb-1 text-sm font-semibold uppercase text-white">Artists</p>
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
                onClick={() =>
                  mode === 'default' ? setParams({ sort: 'default' }) : toggleSort(mode)
                }
                title={label}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded p-1 text-[10px] transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  isActive
                    ? 'ring-1 ring-accent/40 bg-accent/10 font-medium text-accent hover:bg-accent/15'
                    : 'bg-column-header-text/5 text-column-header-text/70 hover:bg-column-header-text/10 hover:text-column-header-text'
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
      <ul className="max-h-[calc(100vh-2rem)] list-none space-y-1 overflow-y-auto pr-2 text-sm">
        {sortedItems.map(({ name, anchor, count }) => {
          const isActive = anchor === activeAnchor;
          return (
            <li key={anchor} className="ml-0 list-none">
              <a
                href={`#${anchor}`}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1 transition-colors ${
                  isActive
                    ? 'bg-surface-hover font-medium text-text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <span className="truncate">{name}</span>
                <span className="text-xxs text-text-muted">{count}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default TodayIndex;
