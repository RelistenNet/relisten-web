// ---------------------------------------------------------------------------
// Reading the player from components. Selectors should return primitives or
// values that keep their identity, so a component re-renders only when what
// it shows changes. Position (60 fps) is in usePlayback; only the scrubber and
// time display should select it.
// ---------------------------------------------------------------------------

import { useSelector } from '@xstate/react';
import { useMemo } from 'react';
import type { LoadState } from './engine';
import type { PlaybackState } from './playback';
import type { QueueItem, QueueState } from './queue/model';
import { playbackActor, playerActor } from './runtime';

export function useQueue<T>(
  select: (queue: QueueState) => T,
  compare?: (a: T, b: T) => boolean
): T {
  return useSelector(playerActor, (s) => select(s.context.queue), compare);
}

export function usePlayback<T>(
  select: (playback: PlaybackState) => T,
  compare?: (a: T, b: T) => boolean
): T {
  return useSelector(playbackActor, (s) => select(s.context), compare);
}

/** The entry playing (or paused on), or null. */
export const useCurrentItem = (): QueueItem | null => useQueue((q) => q.current?.item ?? null);

/** Whether audio is playing. */
export const useIsPlaying = (): boolean => usePlayback((p) => p.playing);

/**
 * Web Audio load state ('LOADED' = gapless-ready) by track id, for the playing
 * context's tracks. Changes a few times per track, not per frame.
 */
export function useTrackStatuses(): Record<string, LoadState> {
  const statuses = usePlayback((p) => p.statuses);
  const items = useQueue((q) => q.context?.items);
  return useMemo(() => {
    const byTrack: Record<string, LoadState> = {};
    for (const item of items ?? []) {
      const state = statuses[item.key];
      if (state) byTrack[item.trackId] = state;
    }
    return byTrack;
  }, [statuses, items]);
}
