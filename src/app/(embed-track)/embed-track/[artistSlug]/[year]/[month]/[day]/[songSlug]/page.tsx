import PlayerManager from '@/components/PlayerManager';
import EmbedTrackList from '@/components/EmbedTrackList';
import { proxyStreamUrl } from '@/lib/proxyStreamUrl';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';
import { contextSearchParamsLoader } from './search-params';
import type { Track } from '@/types';

export default async function SingleTrackEmbedPage() {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  if (!year || !month || !day || !songSlug) return deny(404);

  const [show, artists] = await Promise.all([
    RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day)),
    RelistenAPI.fetchAllArtists(),
  ]);

  if (!show) deny(404);

  const artistName = artists?.find((a) => a.slug === artistSlug)?.name;

  const allTracks = show.sources?.[0]?.sets?.flatMap((set) => set.tracks ?? []) ?? [];
  const anchorIndex = allTracks.findIndex((t) => t?.slug === songSlug);

  if (anchorIndex === -1) return deny(404);

  const { context } = await contextSearchParamsLoader.get();
  const startIdx = Math.max(0, anchorIndex - context);
  const endIdx = Math.min(allTracks.length, anchorIndex + context + 1);
  const contextTracks = allTracks.slice(startIdx, endIdx).filter((t): t is Track => t != null);
  const trackSlugs = contextTracks.map((t) => t.slug!);

  return (
    <>
      {contextTracks.length > 1 && (
        <EmbedTrackList
          tracks={contextTracks}
          startPosition={startIdx + 1}
        />
      )}
      <PlayerManager
        artistSlug={artistSlug}
        year={year}
        month={month}
        day={day}
        show={show}
        artistName={artistName}
        routePrefix="/embed-track"
        playImmediately={false}
        trackSlugs={trackSlugs}
      />
    </>
  );
}

export async function metadata() {
  const params = getSegmentParams(SEGMENT_PATH);
  const artists = await RelistenAPI.fetchAllArtists();
  const artistSlug = params?.artistSlug as string | undefined;
  const year = params?.year as string | undefined;
  const month = params?.month as string | undefined;
  const day = params?.day as string | undefined;
  const songSlug = params?.songSlug as string | undefined;

  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name || !year || !month || !day) return {};

  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  const songs = show?.sources
    ?.map((source) => source?.sets?.map((set) => set?.tracks).flat())
    .flat();

  const song = songs?.find((song) => song?.slug === songSlug);

  return {
    title: [song?.title, createShowDate(year, month, day), name].filter((x) => x).join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
    alternates: {
      canonical: `/${artistSlug}/${year}/${month}/${day}/${songSlug}`,
    },
    openGraph: {
      audio: [
        {
          url: proxyStreamUrl(song?.mp3_url),
        },
      ],
    },
  };
}
