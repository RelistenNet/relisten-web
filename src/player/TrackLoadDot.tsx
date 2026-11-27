'use client';

import cn from '@/lib/cn';
import { usePlayback } from './hooks';

const STATES = {
  LOADED: { label: 'Gapless: loaded', className: 'bg-emerald-500' },
  LOADING: { label: 'Loading', className: 'animate-pulse bg-amber-500' },
  ERROR: { label: "Couldn't load", className: 'bg-red-500' },
} as const;

/**
 * An entry's Web Audio load state as a small dot (TrackLoadTag's quieter form),
 * for pages that read more than they scan. Keyed by queue entry key.
 */
export default function TrackLoadDot({ entryKey }: { entryKey: string }) {
  const state = usePlayback((p) => p.statuses[entryKey]);
  const shown = state && state !== 'NONE' ? STATES[state] : null;
  if (!shown) return null;
  return (
    <span title={shown.label} className="inline-flex items-center">
      <span aria-hidden className={cn('size-1.5 rounded-full', shown.className)} />
      <span className="sr-only">{shown.label}</span>
    </span>
  );
}
