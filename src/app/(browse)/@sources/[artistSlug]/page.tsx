import TapesColumn from '@/components/TapesColumn';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function SourcesDaySlot() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);

  // Fetch show data
  const show = await RelistenAPI.fetchRandomShow(artistSlug);

  if (!show) return null;

  const { year, month, day } = splitShowDate(show.display_date);

  return <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
