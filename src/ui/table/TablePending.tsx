'use client';

import { usePendingNavigation } from '@timber-js/app/client';
import type { ReactNode } from 'react';
import cn from '@/lib/cn';

/** Dims the table while a sort/filter/page navigation is in flight. */
export default function TablePending({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pending = usePendingNavigation();
  return (
    <div aria-busy={pending} className={cn(className, pending && 'opacity-60')}>
      {children}
    </div>
  );
}
