import TapesColumn from '@/components/TapesColumn';
import { isMobile } from '@/lib/isMobile';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function SourcesDaySlot() {
  if (await isMobile()) return null;
  const { artistSlug, year, month, day } = getSegmentParams(SEGMENT_PATH);

  // Fetch show data
  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day[0]));

  if (!show) return null;

  return <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day[0]} show={show} />;
}
