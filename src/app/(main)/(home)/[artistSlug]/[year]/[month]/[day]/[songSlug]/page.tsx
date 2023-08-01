'use client';

import { useSourceData } from '@/components/SongsColumn';
import player, { initGaplessPlayer, isPlayerMounted } from '@/lib/player';
import { createShowDate } from '@/lib/utils';
import { store } from '@/redux';
import { updatePlayback } from '@/redux/modules/playback';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [artistSlug, year, month, day, songSlug] = String(pathname).replace(/^\//, '').split('/');
  const source = searchParams?.get('source') as string;

  const { activeSourceObj } = useSourceData({ year, month, day, artistSlug, source });

  useEffect(() => {
    if (activeSourceObj) {
      const tracks = activeSourceObj.sets?.map((set) => set.tracks).flat() ?? [];
      const activeTrackIndex = tracks.findIndex((track) => track?.slug === songSlug);
      const activeTrack = tracks[activeTrackIndex];
      const playImmediately = true;

      store.dispatch(
        updatePlayback({
          artistSlug,
          year,
          showDate: createShowDate(year, month, day),
          songSlug,
          source,
          paused: false,
        })
      );

      if (tracks.length && typeof window.Notification !== 'undefined') {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }

      if (!isPlayerMounted()) {
        initGaplessPlayer(store, (url: string) => router.replace(url));
      } else {
        // check if track is already in queue, and re-use
        console.log(player.currentTrack, activeTrack);
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
  }, [pathname, searchParams, activeSourceObj]);

  return null;
}
