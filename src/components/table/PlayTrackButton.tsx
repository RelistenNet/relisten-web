'use client';

import { Pause, Play } from 'lucide-react';
import { useSelector } from 'react-redux';
import player, { loadTracks } from '@/lib/player';
import type { PlayableTrack } from '@/lib/table/showRows';
import { splitShowDate } from '@/lib/utils';
import type { RootState } from '@/redux';
import { store } from '@/redux';
import { updatePlayback } from '@/redux/modules/playback';
import type { Track } from '@/types';

type Props = {
  track: PlayableTrack;
  artistSlug: string;
  artistName: string;
  /** YYYY-MM-DD */
  date: string;
  /** Screen-reader label, e.g. "Play 2025-07-27 (5 of 6)". */
  label: string;
};

/**
 * Plays one performance in place: the file goes straight into the player, no
 * navigation. While it's the current track, the button pauses and resumes.
 */
export default function PlayTrackButton({ track, artistSlug, artistName, date, label }: Props) {
  const isCurrent = useSelector(({ playback }: RootState) => playback.activeTrack?.id === track.id);
  const isPlaying = useSelector(
    ({ playback }: RootState) => isCurrent && !playback.activeTrack?.isPaused
  );

  if (!track.mp3Url) return null;

  const play = () => {
    if (isCurrent) {
      player.togglePlayPause?.();
      return;
    }
    const { year, month, day } = splitShowDate(date);
    // The same playback context a show page sets, so the player bar, saved
    // state, and scrobbles all describe this track.
    store.dispatch(
      updatePlayback({
        artistSlug,
        artistName,
        year,
        month,
        day,
        showDate: date,
        songSlug: track.slug,
        source: track.sourceId,
        paused: false,
      })
    );
    const playerTrack: Track = {
      id: track.id,
      slug: track.slug,
      title: track.title,
      mp3_url: track.mp3Url,
      duration: track.duration ?? undefined,
    };
    loadTracks([playerTrack], track.slug, { playImmediately: true });
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
