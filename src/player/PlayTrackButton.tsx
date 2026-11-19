'use client';

import { Pause, Play } from 'lucide-react';
import type { PlayableTrack } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import { playSongRows, togglePlayPause } from './commands';
import { useCurrentItem, useIsPlaying } from './hooks';
import { useSongQueue } from './SongQueue';
import { songRowItem } from './queue/items';
import Tooltip from '@/ui/base/Tooltip';

type Props = {
  row: ShowRow;
  track: PlayableTrack;
  /** Screen-reader label, e.g. "Play 2025-07-27 (5 of 6)". */
  label: string;
};

/** Play a row's track (then the rest of the rows on screen); toggles play/pause while it's current. */
function usePlayTrack(row: ShowRow, track: PlayableTrack) {
  const isCurrent = useCurrentItem()?.trackId === track.id;
  const isPlaying = useIsPlaying() && isCurrent;
  const queue = useSongQueue();

  const play = () => {
    if (isCurrent) {
      togglePlayPause();
      return;
    }
    // Outside a table's provider, queue just this row.
    const own = songRowItem({ ...row, track });
    const items = queue?.items.length ? queue.items : own ? [own] : [];
    playSongRows({
      items,
      label: queue?.label ?? track.title ?? '',
      startTrackId: track.id,
    });
  };
  return { isCurrent, isPlaying, play };
}

/**
 * Plays a table row's track in place (a song's performance, a show's track),
 * then the rest of the rows on screen, in table order. While it's the current track, the button pauses and resumes.
 */
export default function PlayTrackButton({ row, track, label }: Props) {
  const { isCurrent, isPlaying, play } = usePlayTrack(row, track);
  if (!track.mp3Url) return null;

  const Icon = isPlaying ? Pause : Play;
  const button = (
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
  // Playing swaps the queue's list for these rows (Next up stays): say so before the click.
  if (isCurrent) return button;
  return (
    <Tooltip content="Play (replaces queue)" align="top">
      {button}
    </Tooltip>
  );
}

/**
 * A table row's click target (DataTable's `rowAction`): plays the row's track,
 * or resumes it. A click on the track that's playing leaves it playing. Hidden
 * from keyboards and screen readers: the row's play button does the same.
 */
export function PlayTrackRow({ row, track }: { row: ShowRow; track: PlayableTrack }) {
  const { isPlaying, play } = usePlayTrack(row, track);
  if (!track.mp3Url) return null;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={() => !isPlaying && play()}
      className="absolute! inset-0 z-0! cursor-pointer"
    />
  );
}
