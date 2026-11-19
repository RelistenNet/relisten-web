'use client';

import Tag from '@/ui/base/Tag';
import { usePlayback } from './hooks';

/** A track's Web Audio load state from the player (GAPLESS / LOADING / ERROR), as the browse column shows it. */
export default function TrackLoadTag({
  trackId,
  className,
}: {
  trackId: string;
  className?: string;
}) {
  // Statuses are keyed by entry key, which is the track id.
  const state = usePlayback((p) => p.statuses[trackId]);
  if (state === 'LOADED')
    return (
      <Tag variant="success" className={className}>
        {'✓'} GAPLESS
      </Tag>
    );
  if (state === 'LOADING')
    return (
      <Tag variant="warning" className={className}>
        LOADING
      </Tag>
    );
  if (state === 'ERROR')
    return (
      <Tag variant="error" className={className}>
        ERROR
      </Tag>
    );
  return null;
}
