'use client';

import { Pause, Play } from 'lucide-react';
import type { PlayableTrack } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import { playSongRows, togglePlayPause } from '@/player/commands';
import { useCurrentItem, useIsPlaying } from '@/player/hooks';
import { useSongQueue } from './SongQueue';
import { songRowItem } from '@/player/queue/items';

type Props = {
  row: ShowRow;
  track: PlayableTrack;
  /** Screen-reader label, e.g. "Play 2025-07-27 (5 of 6)". */
  label: string;
};

/**
 * Plays a performance in place, then the rest of the performances on screen,
 * in table order. While it's the current track, the button pauses and resumes.
 */
export default function PlayTrackButton({ row, track, label }: Props) {
  const isCurrent = useCurrentItem()?.trackId === track.id;
  const isPlaying = useIsPlaying() && isCurrent;
  const queue = useSongQueue();

  if (!track.mp3Url) return null;

  const play = () => {
    if (isCurrent) {
      togglePlayPause();
      return;
    }
    // Outside the song table's provider, queue just this row.
    const own = songRowItem({ ...row, track });
    const items = queue?.items.length ? queue.items : own ? [own] : [];
    playSongRows({
      items,
      label: queue?.label ?? track.title ?? '',
      startTrackId: track.id,
    });
  };

  const Icon = isPlaying ? Pause : Play;
  return (
    <button
      type="button"
      onClick={play}
      aria-label={isPlaying ? `Pause ${label.replace(/^Play /, '')}` : label}
      aria-pressed={isCurrent}
      className="inline-flex rounded-full p-1.5 text-accent hover:bg-surface-hover"
    >
      <Icon className="size-4 shrink-0" aria-hidden />
    </button>
  );
}
