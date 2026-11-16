'use client';

import { playShow } from './commands';
import type { PlayableTape, ShowInfo } from './queue/items';
import { tSearchParamsLoader } from '@/lib/searchParams/tSearchParam';
import { useEffect, useEffectEvent } from 'react';

interface PlayerManagerProps {
  show: ShowInfo;
  /** The tape to play, picked on the server from `?source=` (see activeTape). */
  tape: PlayableTape;
  artistSlug: string;
  artistName: string;
  songSlug: string;
  /** Start playing, or queue the tape paused (embeds wait for the viewer's click). */
  play: boolean;
  /** Queue only these tracks (the single-track embed). */
  trackSlugs?: string[];
}

/**
 * Arriving at a track page means "play this tape from this track": a shared
 * link, a reload, or a link from another page (a show's detail page, the
 * live feed). The queue keeps Next up; the track already current is left
 * alone, playing or paused.
 *
 * Clicking a track in a track list doesn't come through here: the list plays
 * it from the tape it already holds (PlayingTrackList), and the URL follows.
 */
export default function PlayerManager(props: PlayerManagerProps) {
  const [{ t: seekTime }] = tSearchParamsLoader.useQueryStates();

  // Non-reactive values (props, ?t=) are read at sync time; only the deps below re-trigger it.
  const syncPlayer = useEffectEvent(() => {
    const { show, tape, artistSlug, artistName, songSlug, play, trackSlugs } = props;

    if (typeof window.Notification !== 'undefined') {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    playShow({
      show,
      source: tape,
      artistSlug,
      artistName,
      trackSlug: songSlug,
      trackSlugs,
      play,
      startTime: seekTime,
    });
  });

  // trackSlugs by value: a refresh hands over a new array with the same slugs,
  // which mustn't replay the tape.
  const trackSlugsKey = props.trackSlugs?.join('\n');
  useEffect(() => {
    syncPlayer();
  }, [props.show.id, props.tape.id, props.songSlug, trackSlugsKey]);

  return null;
}
