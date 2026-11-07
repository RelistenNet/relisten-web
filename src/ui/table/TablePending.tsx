'use client';

import { usePendingNavigation } from '@timber-js/app/client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import cn from '@/lib/cn';

// Whether the rows on screen are out of date. Two sources: one of the table's
// own navigations in flight (sort, filter, page: same page, new query; a link
// to another page leaves the rows alone), and the search box, which marks the
// rows stale from the first keystroke until its results render. Local searches
// return in tens of milliseconds, so tracking only the request would flash
// rather than fade; following the search's whole arc (debounce and request)
// gives the fade time to read.

type TableStateValue = {
  stale: boolean;
  setStale: (stale: boolean) => void;
  /** Whether the navigation in flight is one of the table's own. */
  ownNavigation: boolean;
  /** Called as the table starts a navigation of its own (the toolbar's controls). */
  markOwnNavigation: () => void;
};

const StaleContext = createContext<TableStateValue | null>(null);

/** A click on a link to this page with another query: the table's own navigation. */
const isSamePageLink = (target: EventTarget | null) => {
  const a = target instanceof Element ? target.closest('a[href]') : null;
  if (!(a instanceof HTMLAnchorElement) || a.target === '_blank') return false;
  const url = new URL(a.href, location.href);
  return url.origin === location.origin && url.pathname === location.pathname;
};

/** Shares the stale state between a table's toolbar and its rows. */
export function TableState({ children }: { children: ReactNode }) {
  const [stale, setStale] = useState(false);
  const [ownNavigation, setOwnNavigation] = useState(false);
  const pending = usePendingNavigation();
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // A click that starts nothing (a link to the exact current URL) must not
  // leave the flag set for some later navigation elsewhere.
  const markOwnNavigation = useCallback(() => {
    setOwnNavigation(true);
    setTimeout(() => {
      if (!pendingRef.current) setOwnNavigation(false);
    }, 250);
  }, []);

  // Links anywhere on the page count (the year chart sits outside the table).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (isSamePageLink(e.target)) markOwnNavigation();
    };
    // Capture: client-side links cancel the click (to navigate themselves)
    // before it would bubble up to the document.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [markOwnNavigation]);

  // Done once nothing is in flight. Adjusted during render, as React recommends.
  const [wasPending, setWasPending] = useState(pending);
  if (pending !== wasPending) {
    setWasPending(pending);
    if (!pending) setOwnNavigation(false);
  }

  return (
    <StaleContext.Provider
      value={{
        stale,
        setStale,
        ownNavigation,
        markOwnNavigation,
      }}
    >
      {children}
    </StaleContext.Provider>
  );
}

/** Marks a navigation the table starts itself (rather than through a link). */
export const useMarkOwnNavigation = () => useContext(StaleContext)?.markOwnNavigation;

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
  const pending = usePendingNavigation();
  const state = useContext(StaleContext);
  const dimmed = !!state?.stale || (pending && !!state?.ownNavigation);
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
