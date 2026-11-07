'use client';

import { usePendingNavigation } from '@timber-js/app/client';
import type { ReactNode } from 'react';
import cn from '@/lib/cn';

/**
 * Fades the table while a navigation replaces its rows: same path, new query
 * (search, sort, filter, page). A link to another page leaves them alone.
 */
export default function TablePending({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const replacing = usePendingNavigation((to, from) => to.pathname === from.pathname);
  return (
    <div
      aria-busy={replacing}
      className={cn(
        className,
        'transition-opacity',
        replacing ? 'opacity-60 duration-300 ease-out' : 'duration-400 ease-in-out'
      )}
    >
      {children}
    </div>
  );
}
