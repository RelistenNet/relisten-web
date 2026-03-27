import SongsColumn from '@/components/SongsColumn';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { rawSegmentParams } from '@timber-js/app/server';

export default async function SongsDaySlot() {
  const { artistSlug, year, month, day } = await rawSegmentParams();

  // Fetch show data
  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  if (!show) return null;

  return <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
