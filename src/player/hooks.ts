// ---------------------------------------------------------------------------
// Reading the player from components. Selectors should return primitives or
// values that keep their identity, so a component re-renders only when what
// it shows changes. Position changes 60 times a second: never select it raw.
// Select what's shown from it (the formatted time), or paint it with
// usePlaybackFrame.
// ---------------------------------------------------------------------------

import { useSelector } from '@xstate/react';
import { useEffectEvent, useLayoutEffect } from 'react';
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

/** The playback state now, without subscribing (an initial value, a click). */
export const readPlayback = (): PlaybackState => playbackActor.getSnapshot().context;

export function usePlayback<T>(
  select: (playback: PlaybackState) => T,
  compare?: (a: T, b: T) => boolean
): T {
  return useSelector(playbackActor, (s) => select(s.context), compare);
}

/** The entry playing (or paused on), or null. */
export const useCurrentItem = (): QueueItem | null => useQueue((q) => q.current?.item ?? null);

/**
 * Paint something that moves with every progress frame (a progress bar's
 * width) straight to the DOM, without rendering. Position as React state
 * re-renders at sync priority 60 times a second, and each of those restarts a
 * transition render in progress: while audio played, a navigation to a big
 * page restarted every frame until React's 5s starvation limit forced it.
 * `paint` also runs after every render, so a change in what it draws (the
 * duration, a drag) shows at once. Give it refs and guard for null.
 */
export function usePlaybackFrame(paint: (playback: PlaybackState) => void): void {
  const onFrame = useEffectEvent(paint);
  useLayoutEffect(() => onFrame(readPlayback()));
  useLayoutEffect(() => {
    const sub = playbackActor.subscribe((s) => onFrame(s.context));
    return () => sub.unsubscribe();
  }, []);
}

/** Whether audio is playing. */
export const useIsPlaying = (): boolean => usePlayback((p) => p.playing);

/**
 * Web Audio load state ('LOADED' = gapless-ready) by entry key, which for the
 * playing context's entries is the track id. Changes a few times per track,
 * not per frame.
 */
export const useTrackStatuses = (): Record<string, LoadState> => usePlayback((p) => p.statuses);
