'use client';

import { useSelectedLayoutSegments } from '@timber-js/app/client';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import cn from '@/lib/cn';
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

function getActiveColumn(segments: string[], hasSlug: boolean): number {
  const depth = segments.length;
  if (depth <= 0) return 0;
  if (depth === 1) return 1;
  if (depth === 2 && isQuickHitSegment(segments[1]) && !hasSlug) return 1;
  if (depth <= 3) return 2;
  return 3;
}

function getContentKey(segments: string[], hasSlug: boolean): string {
  if (segments.length === 2 && isQuickHitSegment(segments[1]) && !hasSlug) {
    return segments[1];
  }
  return '';
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
  const segments = useSelectedLayoutSegments();
  const [{ slug }] = slugSearchParams.useQueryStates();
  const hasSlug = !!slug;
  const activeColumn = getActiveColumn(segments, hasSlug);
  const contentKey = getContentKey(segments, hasSlug);

  const [displayedColumn, setDisplayedColumn] = useState(activeColumn);
  const prevColumn = useRef(activeColumn);
  const prevContentKey = useRef(contentKey);
  const isTraversalNav = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isTraversalNav.current = true;
    };
    window.addEventListener('popstate', onPopState);

    const nav = 'navigation' in window ? (window as any).navigation : null;
    const onNavigate = (e: any) => {
      if (e.navigationType === 'traverse') isTraversalNav.current = true;
    };
    nav?.addEventListener('navigate', onNavigate);

    return () => {
      window.removeEventListener('popstate', onPopState);
      nav?.removeEventListener('navigate', onNavigate);
    };
  }, []);

  useLayoutEffect(() => {
    const columnChanged = activeColumn !== prevColumn.current;
    const contentChanged = contentKey !== prevContentKey.current;

    const prevCol = prevColumn.current;
    prevColumn.current = activeColumn;
    prevContentKey.current = contentKey;

    if (!columnChanged && !contentChanged) return;

    const isMobile = window.matchMedia(MOBILE_MQ).matches;

    if (!isMobile || !document.startViewTransition || isTraversalNav.current) {
      isTraversalNav.current = false;
      setDisplayedColumn(activeColumn);
      return;
    }

    if (columnChanged) {
      const direction = activeColumn > prevCol ? 'forward' : 'back';
      document.documentElement.setAttribute('data-nav-direction', direction);
    } else {
      document.documentElement.setAttribute('data-nav-direction', 'swap');
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => setDisplayedColumn(activeColumn));
    });

    transition.finished.then(() => {
      document.documentElement.removeAttribute('data-nav-direction');
    });
  }, [activeColumn, contentKey]);

  return (
    <div
      data-browse-depth={displayedColumn}
      className={cn(
        `
          browse-grid flex min-h-0 flex-1 flex-col bg-surface-recessed
          max-lg:overflow-visible
          lg:overflow-y-auto lg:overflow-hidden lg:px-4
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
