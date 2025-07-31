'use client';

import { Props, useSourceData } from '@/components/SongsColumn';
import player, { initGaplessPlayer, isPlayerMounted } from '@/lib/player';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { createShowDate } from '@/lib/utils';
import { store } from '@/redux';
import { updatePlayback } from '@/redux/modules/playback';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface PlayerManagerProps extends Props {
  playImmediately?: boolean;
}

export default function PlayerManager(props: PlayerManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [{ source: sourceId }] = sourceSearchParamsLoader.useQueryStates();

  // Remove leading slash and handle embed routes
  const pathParts = String(pathname)
    .replace(/^\/embed/, '')
    .replace(/^\//, '')
    .split('/');

  const [artistSlug, year, month, day, songSlug] = pathParts;

  const { activeSourceObj } = useSourceData({ ...props, source: sourceId });

  useEffect(() => {
    if (activeSourceObj) {
      const tracks = activeSourceObj.sets?.map((set) => set.tracks).flat() ?? [];
      const activeTrackIndex = tracks.findIndex((track) => track?.slug === songSlug);
      const activeTrack = tracks[activeTrackIndex];
      const playImmediately = props.playImmediately ?? true;

      store.dispatch(
        updatePlayback({
          artistSlug,
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

      if (!isPlayerMounted()) {
        initGaplessPlayer(store, (url: string) => {
          if (window.location.pathname !== url) {
            router.replace((props.routePrefix ?? '') + url);
          }
        });
      } else {
        // check if track is already in queue, and re-use
        if (player.currentTrack?.metadata?.trackId === activeTrack?.id) {
          console.log('track is already playing');
          return;
        }

        const prevFirstTrack = player.tracks[0];
        const nextFirstTrack = tracks[0];
        if (
          prevFirstTrack &&
          nextFirstTrack &&
          prevFirstTrack.metadata.trackId === nextFirstTrack.id
        ) {
          player.gotoTrack(activeTrackIndex, playImmediately);
          return;
        } else {
          player.pauseAll();
          // player.cleanUp();
          player.tracks = [];
        }
      }

      tracks.map((track) => {
        const url = window.FLAC ? track?.flac_url || track?.mp3_url : track?.mp3_url;

        player.addTrack({
          trackUrl: url,
          skipHEAD: /phish\.in/.test(String(url)), // skip phish from loading head due to cloudflare
          metadata: {
            trackId: track?.id,
          },
        });
      });

      store.dispatch(updatePlayback({ tracks }));

      player.gotoTrack(activeTrackIndex, playImmediately);
    }
  }, [pathname, sourceId, activeSourceObj]);

  return null;
}
