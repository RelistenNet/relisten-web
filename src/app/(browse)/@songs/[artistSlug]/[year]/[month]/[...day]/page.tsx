import SongsColumn from '@/components/SongsColumn';
import { paramAsString } from '@/lib/paramHelpers';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';

export default async function SongsDaySlot() {
  const raw = await getSegmentParams();
  const artistSlug = paramAsString(raw.artistSlug);
  const year = paramAsString(raw.year);
  const month = paramAsString(raw.month);
  const day = paramAsString(raw.day);

  // Fetch show data
  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  if (!show) return null;

  return <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
