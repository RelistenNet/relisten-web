'use client';

import { usePathname } from '@timber-js/app/client';
import cn from '@/lib/cn';
import { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

function getDepth(pathname: string): number {
  const segments = pathname.split('/').filter(Boolean);
  return segments.length;
}

// Maps URL depth to which column index (0-based) to show on mobile.
// 0 segments (/)                    → 0 (artists)
// 1 segment  (/artist)              → 1 (years)
// 2 segments (/artist/year)         → 2 (shows)
// 3 segments (/artist/year/month)   → 2 (shows — month is part of date)
// 4 segments (/artist/y/m/d)        → 3 (songs)
// 5 segments (/artist/y/m/d/song)   → 3 (songs)
function getActiveColumn(depth: number): number {
  if (depth <= 0) return 0;
  if (depth === 1) return 1;
  if (depth <= 3) return 2;
  return 3;
}

const MOBILE_MQ = '(max-width: 1023px)';

export default function BrowseContainer({
  children,
  className,
  isInIframe,
}: {
  children: ReactNode;
  className?: string;
  isInIframe?: boolean;
}) {
  const pathname = usePathname();
  const depth = getDepth(pathname);
  const activeColumn = getActiveColumn(depth);

  const [displayedColumn, setDisplayedColumn] = useState(activeColumn);
  const prevColumn = useRef(activeColumn);

  useLayoutEffect(() => {
    if (activeColumn === prevColumn.current) return;

    const direction = activeColumn > prevColumn.current ? 'forward' : 'back';
    prevColumn.current = activeColumn;

    const isMobile = window.matchMedia(MOBILE_MQ).matches;

    if (!isMobile || !document.startViewTransition) {
      setDisplayedColumn(activeColumn);
      return;
    }

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
          browse-grid flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-recessed
          lg:overflow-y-auto lg:px-4
          lg:grid lg:grid-flow-col lg:grid-cols-5 lg:grid-rows-1 lg:gap-x-4
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
