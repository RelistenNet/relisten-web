import { href } from '@timber-js/app/routes';
import { loadArtists, loadShow, loadTrackPage } from '@/features/browse/load';
import PlayerManager from '@/player/PlayerManager';
import TrackList from '@/player/PlayingTrackList';
import { proxyStreamUrl } from '@/player/proxyStreamUrl';
import { createShowDate } from '@/lib/utils';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { trackSearchParams } from '@/lib/searchParams/trackSearchParams';
import { SEGMENT_PATH } from './$segment';

// The embed's track list plays a clicked track in place (the URL follows), so
// this page renders on load, and on a link into the embed only.
export default async function EmbedSongPage() {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  if (!year || !month || !day) return deny(404);

  const { songs, show, tape, artistName } = await loadTrackPage(
    'embed',
    { artistSlug, year, month, day, songSlug },
    trackSearchParams
  );

  return (
    <div className="flex h-full">
      <div className="w-full shrink-0 overflow-y-auto border-r px-2">
        <TrackList
          artistSlug={artistSlug}
          artistName={artistName}
          year={year}
          month={month}
          day={day}
          show={songs}
          trackRoute="embed"
        />
      </div>
      <PlayerManager
        show={show}
        tape={tape}
        artistSlug={artistSlug}
        artistName={artistName}
        songSlug={songSlug}
        play={false}
      />
    </div>
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
