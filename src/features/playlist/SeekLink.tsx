'use client';

import type { ReactNode } from 'react';
import { durationToHHMMSS } from '@/lib/utils';
import { play, playSongRows, seek } from '@/player/commands';
import { useIsPlaying, useQueue } from '@/player/hooks';
import { useSongQueue } from '@/player/SongQueue';

/**
 * A timestamp in a playlist's prose: seeks the entry if it's the one playing,
 * else plays the playlist from that entry at that moment. The page only renders
 * one for an entry it can play; others stay text. The href is the fragment as
 * written, so it reads right on hover and does nothing harmful without JS.
 */
export default function SeekLink({
  entryId,
  seconds,
  href,
  children,
}: {
  entryId: string;
  seconds: number;
  href: string;
  children: ReactNode;
}) {
  const queue = useSongQueue();
  const isCurrent = useQueue((q) => q.current?.key === entryId);
  const isPlaying = useIsPlaying();
  return (
    <a
      href={href}
      title={`Play from ${durationToHHMMSS(seconds)}`}
      onClick={(e) => {
        e.preventDefault();
        if (isCurrent) {
          seek(seconds);
          if (!isPlaying) play();
        } else if (queue) {
          playSongRows({ ...queue, startKey: entryId, startTime: seconds });
        }
      }}
      className="
        font-medium text-accent tabular-nums underline decoration-accent/30 underline-offset-2
        transition-colors hover:decoration-accent
      "
    >
      {children}
    </a>
  );
}
