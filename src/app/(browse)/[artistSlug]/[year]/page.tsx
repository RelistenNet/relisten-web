import PlayerManager from '@/components/PlayerManager';
import RelistenAPI from '@/lib/RelistenAPI';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import { sourceSearchParamsLoader } from '@/lib/searchParams/sourceSearchParam';
import { splitShowDate } from '@/lib/utils';
import { matchedTrack, pickSource } from '@/lib/songMatch';
import { fromSourceParam } from '@/lib/sourceParam';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

function capitalizeFirstLetterOfEachWord(val: string): string {
  if (!val) return '';
  return String(val)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function Page() {
  const params = getSegmentParams(SEGMENT_PATH);
  const year = params?.year as string | undefined;

  if (!year || !isQuickHitSegment(year)) return null;

  const { date, track, slug } = await slugSearchParams.get();
  const { source } = sourceSearchParamsLoader.get();
  if (!date) return null;

  const { year: y, month: m, day: d } = splitShowDate(date);
  if (!y || !m || !d) return null;

  const artistSlug = params?.artistSlug as string;

  const [show, artists, song] = await Promise.all([
    RelistenAPI.fetchShow(artistSlug, y, date),
    RelistenAPI.fetchAllArtists(),
    year === 'songs' ? RelistenAPI.findSong(artistSlug, slug) : undefined,
  ]);

  // A song + date without a track plays that song: v4 matched it to a track in
  // the show, so find it in the tape being shown (or the best tape that has it).
  const songId = song?.id;
  const songSlug =
    track ??
    matchedTrack(pickSource(show.sources ?? [], fromSourceParam(source), songId), songId)?.slug;
  if (!songSlug) return null;

  const artistName = artists?.find((a) => a.slug === artistSlug)?.name;

  return (
    <PlayerManager
      artistSlug={artistSlug}
      year={y}
      month={m}
      day={d}
      songSlug={songSlug}
      songId={songId}
      show={show}
      artistName={artistName}
      source={source}
    />
  );
}

export const metadata = async () => {
  const params = getSegmentParams(SEGMENT_PATH);
  const artistSlug = params?.artistSlug as string | undefined;
  const year = params?.year as string | undefined;
  if (!artistSlug || !year) return {};

  const artists = await RelistenAPI.fetchAllArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return {};

  return {
    title: [capitalizeFirstLetterOfEachWord(year?.replaceAll('-', ' ')), name].join(' | '),
  };
};
