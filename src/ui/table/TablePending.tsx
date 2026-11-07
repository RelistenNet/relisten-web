'use client';

import { usePendingNavigation } from '@timber-js/app/client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import cn from '@/lib/cn';

// Whether the rows on screen are out of date. Two sources: a navigation in
// flight that replaces this page's content (sort, filter, page: same path, new
// query; a link to another page leaves the rows alone), and the search box, which marks the
// rows stale from the first keystroke until its results render. Local searches
// return in tens of milliseconds, so tracking only the request would flash
// rather than fade; following the search's whole arc (debounce and request)
// gives the fade time to read.

type TableStateValue = { stale: boolean; setStale: (stale: boolean) => void };

const StaleContext = createContext<TableStateValue | null>(null);

/** Shares the stale state between a table's toolbar and its rows. */
export function TableState({ children }: { children: ReactNode }) {
  const [stale, setStale] = useState(false);
  return <StaleContext.Provider value={{ stale, setStale }}>{children}</StaleContext.Provider>;
}

/** Marks the table's rows stale while `stale` is true (the search box, while searching). */
export function useMarkStale(stale: boolean) {
  const setStale = useContext(StaleContext)?.setStale;
  useEffect(() => {
    setStale?.(stale);
  }, [setStale, stale]);
}

/** Fades the table while its rows are out of date. */
export default function TablePending({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // Only a navigation that replaces this page's content (same path, new
  // query); a link away leaves the rows alone.
  const replacing = usePendingNavigation((to, from) => to.pathname === from.pathname);
  const stale = useContext(StaleContext)?.stale ?? false;
  const dimmed = stale || replacing;
  return (
    <div
      aria-busy={dimmed}
      className={cn(
        className,
        'transition-opacity',
        dimmed ? 'opacity-60 duration-300 ease-out' : 'duration-400 ease-in-out'
      )}
    >
      {children}
    </div>
  );
}
