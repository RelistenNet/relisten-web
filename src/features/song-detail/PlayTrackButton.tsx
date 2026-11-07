'use client';

import { Pause, Play } from 'lucide-react';
import { usePathname } from '@timber-js/app/client';
import type { PlayableTrack } from '@/domain/types';
import type { ShowRow } from '@/ui/shows/rows';
import { playSongRow, togglePlayPause } from '@/player/commands';
import { useCurrentItem, useIsPlaying } from '@/player/hooks';
import { SONG_FILTER_IDS, songSearchParams } from './spec';

type Props = {
  row: ShowRow;
  track: PlayableTrack;
  /** Screen-reader label, e.g. "Play 2025-07-27 (5 of 6)". */
  label: string;
};

/**
 * Plays a performance in place, then the rest of the song's performances that
 * match the page's filters, in table order. While it's the current track, the
 * button pauses and resumes.
 */
export default function PlayTrackButton({ row, track, label }: Props) {
  const isCurrent = useCurrentItem()?.trackId === track.id;
  const isPlaying = useIsPlaying() && isCurrent;
  const pathname = usePathname();
  const [tableState] = songSearchParams.useQueryStates();

  if (!track.mp3Url) return null;

  const play = () => {
    if (isCurrent) {
      togglePlayPause();
      return;
    }
    // /artists/[artistSlug]/songs/[songSlug]
    const songSlug = String(pathname).split('/').filter(Boolean).at(-1) ?? '';
    // The table's state that decides its rows (not the page), as /api/queue reads it.
    const state = tableState as Record<string, unknown>;
    const params: Record<string, string> = {};
    for (const k of ['q', 'sort', ...SONG_FILTER_IDS]) {
      const v = state[k];
      if (typeof v === 'string' && v.trim()) params[k] = k === 'q' ? v.trim() : v;
    }
    playSongRow({ row, track, songSlug, params });
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
