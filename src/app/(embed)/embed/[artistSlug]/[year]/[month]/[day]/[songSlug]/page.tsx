import { href } from '@timber-js/app/routes';
import { loadArtists, loadShow } from '@/features/browse/load';
import PlayerManager from '@/player/PlayerManager';
import TrackList from '@/player/PlayingTrackList';
import { proxyStreamUrl } from '@/player/proxyStreamUrl';
import { createShowDate } from '@/lib/utils';
import { songsProjection } from '@/lib/showProjection';
import { activeTape } from '@/lib/sortSources';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { deny, getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// The embed's track list plays a clicked track in place (the URL follows), so
// this page renders on load, and on a link into the embed only.
export default async function EmbedSongPage() {
  const { artistSlug, year, month, day, songSlug } = getSegmentParams(SEGMENT_PATH);

  if (!year || !month || !day) return deny(404);

  const date = createShowDate(year, month, day);
  const [show, artists] = await Promise.all([loadShow(artistSlug, date), loadArtists()]);

  const songs = songsProjection(show);
  const tape = activeTape(songs.sources, sourceSearchParamsLoader.get().source);
  if (!tape) return deny(404);

  const artistName =
    artists.find((a) => a.slug === artistSlug)?.name ?? artistSlug.replace(/-/g, ' ');

  // The tape is an object of `songs`, so Flight sends it once for both.
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
        show={{ id: songs.id, date: songs.date || date, venue: songs.venue }}
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
