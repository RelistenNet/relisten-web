import SongsColumn from '@/components/SongsColumn';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function SongsDaySlot() {
  const { artistSlug, year, month, days } = getSegmentParams(SEGMENT_PATH);

  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, days[0]));

  if (!show) return null;

  return <SongsColumn artistSlug={artistSlug} year={year} month={month} day={days[0]} show={show} />;
}
