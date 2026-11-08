'use client';

import { Props, useSourceData } from '@/components/SongsColumn';
import player, { loadTracks } from '@/lib/player';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { tSearchParamsLoader } from '@/lib/searchParams/tSearchParam';
import { createShowDate } from '@/lib/utils';
import { store } from '@/redux';
import { updatePlayback } from '@/redux/modules/playback';
import { usePathname } from '@timber-js/app/client';
import { useEffect, useEffectEvent } from 'react';

interface PlayerManagerProps extends Props {
  artistName?: string;
  playImmediately?: boolean;
  // Embeds never autoplay on load; only a viewer's click inside the embed starts playback.
  embed?: boolean;
  trackSlugs?: string[];
  songSlug?: string;
  // Server-resolved ?source. Prefer this over nuqs: after a pathname change nuqs
  // returns the previous URL's state for one render, so the effect below would see
  // the new track with the old (often empty) source.
  source?: string;
}

// Only the first sync after a page load is the "load"; later syncs come from the viewer
// clicking a track inside the embed, which should play. Module scope so it survives the
// page remounting on in-embed navigation, and resets on a full reload.
let embedLoadSynced = false;

export default function PlayerManager(props: PlayerManagerProps) {
  const pathname = usePathname();
  const [{ source: querySourceId }] = sourceSearchParamsLoader.useQueryStates();
  const sourceId = props.source ?? querySourceId;
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

  // Non-reactive values (props, ?t=) are read at sync time; only the deps below re-trigger it.
  const syncPlayer = useEffectEvent(() => {
    if (activeSourceObj) {
      const allTracks = (activeSourceObj.sets?.map((set) => set.tracks).flat() ?? []).filter(
        (t): t is NonNullable<typeof t> => t != null
      );
      const { trackSlugs } = props;
      const tracks = trackSlugs
        ? allTracks.filter((t) => t.slug && trackSlugs.includes(t.slug))
        : allTracks;
      const activeTrackIndex = tracks.findIndex((track) => track?.slug === songSlug);
      const activeTrack = tracks[activeTrackIndex];
      const isEmbedLoad = props.embed && !embedLoadSynced;
      if (isEmbedLoad) embedLoadSynced = true;
      const playImmediately = isEmbedLoad ? false : (props.playImmediately ?? true);

      store.dispatch(
        updatePlayback({
          artistSlug,
          artistName: props.artistName,
          year,
          showDate: createShowDate(year, month, day),
          songSlug,
          source: String(activeSourceObj.id),
          paused: !playImmediately,
        })
      );

      if (tracks.length && typeof window.Notification !== 'undefined') {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }

      // check if track is already in queue, and re-use
      if (player.currentTrack?.metadata?.trackId === activeTrack?.id) {
        if (playImmediately) player.play();
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
  });

  useEffect(() => {
    syncPlayer();
  }, [pathname, sourceId, activeSourceObj, props.trackSlugs, songSlug]);

  return null;
}
