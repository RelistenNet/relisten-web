import TapesColumn from '@/components/TapesColumn';
import { isMobile } from '@/lib/isMobile';
import { paramAsString } from '@/lib/paramHelpers';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';

export default async function SourcesDaySlot() {
  if (await isMobile()) return null;

  const artistSlug = paramAsString((await getSegmentParams()).artistSlug);

  // Fetch show data
  const show = await RelistenAPI.fetchRandomShow(artistSlug);

  if (!show) return null;

  const { year, month, day } = splitShowDate(show.display_date);

  return <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
