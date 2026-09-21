'use client';

import { Props, useSourceData } from '@/components/SongsColumn';
import player, { loadTracks } from '@/lib/player';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { tSearchParamsLoader } from '@/lib/searchParams/tSearchParam';
import { createShowDate } from '@/lib/utils';
import { store } from '@/redux';
import { updatePlayback } from '@/redux/modules/playback';
import { usePathname } from '@timber-js/app/client';
import { useEffect } from 'react';

interface PlayerManagerProps extends Props {
  artistName?: string;
  playImmediately?: boolean;
  trackSlugs?: string[];
  songSlug?: string;
}

export default function PlayerManager(props: PlayerManagerProps) {
  const pathname = usePathname();
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();
  const [{ t: seekTime }] = tSearchParamsLoader.useQueryStates();

  const pathParts = String(pathname)
    .replace(/^\/embed-track/, '')
    .replace(/^\/embed/, '')
    .replace(/^\//, '')
    .split('/');

  const artistSlug = props.artistSlug ?? pathParts[0];
  const year = props.year ?? pathParts[1];
  const month = props.month ?? pathParts[2];
  const day = props.day ?? pathParts[3];
  const songSlug = props.songSlug ?? pathParts[4];

  const { activeSourceObj } = useSourceData({ ...props, source: sourceId });

  useEffect(() => {
    if (activeSourceObj) {
      const allTracks = (activeSourceObj.sets?.map((set) => set.tracks).flat() ?? []).filter(
        (t): t is NonNullable<typeof t> => t != null
      );
      const tracks = props.trackSlugs
        ? allTracks.filter((t) => t.slug && props.trackSlugs!.includes(t.slug))
        : allTracks;
      const activeTrackIndex = tracks.findIndex((track) => track?.slug === songSlug);
      const activeTrack = tracks[activeTrackIndex];
      const playImmediately = props.playImmediately ?? true;

      store.dispatch(
        updatePlayback({
          artistSlug,
          artistName: props.artistName,
          year,
          showDate: createShowDate(year, month, day),
          songSlug,
          source: sourceId,
          paused: false,
        })
      );

      if (tracks.length && typeof window.Notification !== 'undefined') {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }

      // check if track is already in queue, and re-use
      if (player.currentTrack?.metadata?.trackId === activeTrack?.id) {
        player.play();
        return;
      }

      const prevFirstTrack = player.tracks?.[0];
      const nextFirstTrack = tracks[0];
      if (
        prevFirstTrack &&
        nextFirstTrack &&
        prevFirstTrack.metadata?.trackId === nextFirstTrack.id
      ) {
        player.gotoTrack(activeTrackIndex, playImmediately);
        return;
      }

      loadTracks(tracks, songSlug, { playImmediately, seekTime });
    }
  }, [pathname, sourceId, activeSourceObj, props.trackSlugs, songSlug]);

  return null;
}
