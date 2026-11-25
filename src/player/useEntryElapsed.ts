'use client';

import { usePlaybackTransition, useQueue } from './hooks';

/**
 * Whole seconds into a queue entry while it's the current one, else null.
 * Changes once a second, as a transition.
 */
export function useEntryElapsed(queueKey: string): number | null {
  const isCurrent = useQueue((q) => q.current?.key === queueKey);
  const second = usePlaybackTransition((p) => (isCurrent ? Math.floor(p.currentTime) : 0));
  return isCurrent ? second : null;
}
