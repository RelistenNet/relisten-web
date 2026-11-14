import { href } from '@timber-js/app/routes';
import { loadArtists, loadShow } from '@/features/browse/load';
import PlayerManager from '@/player/PlayerManager';
import EmbedTrackList from '@/features/embed/EmbedTrackList';
import { proxyStreamUrl } from '@/player/proxyStreamUrl';
import { createShowDate } from '@/lib/utils';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';
import { contextSearchParamsLoader } from './search-params';
import type { Track } from '@/domain/types';

export default async function SingleTrackEmbedPage() {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  if (!year || !month || !day || !songSlug) return deny(404);

  const [show, artists] = await Promise.all([
    loadShow(artistSlug, createShowDate(year, month, day)),
    loadArtists(),
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
  const trackSlugs = contextTracks.flatMap((t) => (t.slug ? [t.slug] : []));

  return (
    <>
      {contextTracks.length > 1 && (
        <EmbedTrackList tracks={contextTracks} startPosition={startIdx + 1} />
      )}
      <PlayerManager
        embed
        artistSlug={artistSlug}
        year={year}
        month={month}
        day={day}
        show={show}
        artistName={artistName}
        trackRoute="embed-track"
        playImmediately={false}
        trackSlugs={trackSlugs}
      />
    </>
  );
}

export async function metadata() {
  const params = getSegmentParams(SEGMENT_PATH);
  const artists = await loadArtists();
  const artistSlug = params?.artistSlug as string | undefined;
  const year = params?.year as string | undefined;
  const month = params?.month as string | undefined;
  const day = params?.day as string | undefined;
  const songSlug = params?.songSlug as string | undefined;

  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!artistSlug || !name || !year || !month || !day || !songSlug) return {};

  const show = await loadShow(artistSlug, createShowDate(year, month, day));

  const songs = show?.sources
    ?.map((source) => source?.sets?.map((set) => set?.tracks).flat())
    .flat();

  const song = songs?.find((song) => song?.slug === songSlug);

  return {
    title: [song?.title, createShowDate(year, month, day), name].filter((x) => x).join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
    alternates: {
      canonical: href('/[artistSlug]/[year]/[month]/[day]/[songSlug]', {
        artistSlug,
        year,
        month,
        day,
        songSlug,
      }),
    },
    openGraph: {
      audio: [
        {
          url: proxyStreamUrl(song?.mp3Url),
        },
      ],
    },
  };
}
