import { loadArtists, loadShow } from '@/features/browse/load';
import { METADATA_BASE } from '@/lib/constants';
import PlayerManager from '@/player/PlayerManager';
import { proxyStreamUrl } from '@/player/proxyStreamUrl';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { createShowDate } from '@/lib/utils';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function Page() {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  if (!year || !month || !day) return deny(404);

  const params = { artistSlug, year, month, day };

  const [show, artists] = await Promise.all([
    loadShow(artistSlug, createShowDate(year, month, day)),
    loadArtists(),
  ]);

  // A missing show already 404s in fetchShow; also 404 when no source has this song.
  const songExists = show?.sources?.some((source) =>
    source.sets?.some((set) => set.tracks?.some((track) => track.slug === songSlug))
  );
  if (!songExists) return deny(404);

  const artistName = artists?.find((a) => a.slug === artistSlug)?.name;
  const { source } = sourceSearchParamsLoader.get();

  return <PlayerManager {...params} show={show} artistName={artistName} source={source} />;
}

export const metadata = async () => {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  const artists = await loadArtists();

  const name = artists?.find((a) => a.slug === artistSlug)?.name;

  if (!name || !year || !month || !day) return {};

  const show = await loadShow(artistSlug, createShowDate(year, month, day));

  const songs = show?.sources
    ?.map((source) => source?.sets?.map((set) => set?.tracks).flat())
    .flat();

  const song = songs?.find((song) => song?.slug === songSlug);

  return {
    title: [song?.title, createShowDate(year, month, day), name].filter((x) => x).join(' | '),
    description: [show?.venue?.name, show?.venue?.location].filter((x) => x).join(' '),
    openGraph: {
      audio: [
        {
          url: proxyStreamUrl(song?.mp3Url),
        },
      ],
      images: show?.id
        ? [
            {
              url: `${METADATA_BASE.origin}/album-art/${show.id}.png`,
              width: 550,
              height: 550,
            },
          ]
        : [],
    },
  };
};
