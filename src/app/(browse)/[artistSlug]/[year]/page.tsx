import PlayerManager from '@/components/PlayerManager';
import RelistenAPI from '@/lib/RelistenAPI';
import { isQuickHitSegment } from '@/lib/quickHitSegments';
import { slugSearchParams } from '@/lib/searchParams/slugSearchParam';
import { splitShowDate } from '@/lib/utils';
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

  const { date, track } = await slugSearchParams.get();
  if (!date || !track) return null;

  const { year: y, month: m, day: d } = splitShowDate(date);
  if (!y || !m || !d) return null;

  const artistSlug = params?.artistSlug as string;

  const [show, artists] = await Promise.all([
    RelistenAPI.fetchShow(artistSlug, y, date),
    RelistenAPI.fetchAllArtists(),
  ]);

  const artistName = artists?.find((a) => a.slug === artistSlug)?.name;

  return (
    <PlayerManager
      artistSlug={artistSlug}
      year={y}
      month={m}
      day={d}
      songSlug={track}
      show={show}
      artistName={artistName}
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
