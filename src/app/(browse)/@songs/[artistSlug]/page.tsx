import SongsColumn from '@/components/SongsColumn';
import { isMobile } from '@/lib/isMobile';
import { paramAsString } from '@/lib/paramHelpers';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';

export default async function SongsDaySlot() {
  if (await isMobile()) return null;

  const artistSlug = paramAsString(getSegmentParams().artistSlug);

  // Fetch show data
  const show = await RelistenAPI.fetchRandomShow(artistSlug);

  if (!show) return null;

  const { year, month, day } = splitShowDate(show.display_date);

  return <SongsColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
