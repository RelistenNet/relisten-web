'use client';

import { usePendingNavigation } from '@timber-js/app/client';
import type { ReactNode } from 'react';

/** Dims the table while a sort/filter/page navigation is in flight. */
export default function TablePending({ children }: { children: ReactNode }) {
  const pending = usePendingNavigation();
  return (
    <div aria-busy={pending} className={pending ? 'opacity-60' : undefined}>
      {children}
    </div>
  );
}
