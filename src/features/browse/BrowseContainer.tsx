'use client';

import { useSelectedLayoutSegments } from '@timber-js/app/client';
import cn from '@/lib/cn';
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/** Which column the URL puts in front on mobile: artists, years, shows, or a show. */
function getActiveColumn(segments: string[]): number {
  const depth = segments.length;
  if (depth <= 0) return 0;
  if (depth === 1) return 1;
  if (depth <= 3) return 2;
  return 3;
}

const MOBILE_MQ = '(max-width: 1023px)';

export default function BrowseContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const segments = useSelectedLayoutSegments();
  const activeColumn = getActiveColumn(segments);

  const [displayedColumn, setDisplayedColumn] = useState(activeColumn);
  const prevColumn = useRef(activeColumn);
  const isTraversalNav = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isTraversalNav.current = true;
    };
    window.addEventListener('popstate', onPopState);

    const nav = 'navigation' in window ? window.navigation : null;
    const onNavigate = (e: NavigateEvent) => {
      if (e.navigationType === 'traverse') isTraversalNav.current = true;
    };
    nav?.addEventListener('navigate', onNavigate);

    return () => {
      window.removeEventListener('popstate', onPopState);
      nav?.removeEventListener('navigate', onNavigate);
    };
  }, []);

  useLayoutEffect(() => {
    if (activeColumn === prevColumn.current) return;

    const prevCol = prevColumn.current;
    prevColumn.current = activeColumn;

    const isMobile = window.matchMedia(MOBILE_MQ).matches;

    if (!isMobile || !document.startViewTransition || isTraversalNav.current) {
      isTraversalNav.current = false;
      setDisplayedColumn(activeColumn);
      return;
    }

    const direction = activeColumn > prevCol ? 'forward' : 'back';
    document.documentElement.setAttribute('data-nav-direction', direction);

    const transition = document.startViewTransition(() => {
      flushSync(() => setDisplayedColumn(activeColumn));
    });

    transition.finished.then(() => {
      document.documentElement.removeAttribute('data-nav-direction');
    });
  }, [activeColumn]);

  return (
    <div
      data-browse-depth={displayedColumn}
      className={cn(
        `
          browse-grid flex min-h-0 flex-1 flex-col bg-surface-recessed
          max-lg:overflow-visible
          lg:grid lg:grid-flow-col lg:grid-cols-5
          lg:grid-rows-1 lg:gap-x-4 lg:overflow-hidden lg:overflow-y-auto lg:px-4
          lg:[&_.relisten-column]:border-x lg:[&_.relisten-column]:border-hairline
        `,
        {
          ['lg:grid-cols-4']: isInIframe,
        },
        className
      )}
    >
      {children}
    </div>
  );
}
