import TapesColumn from '@/components/TapesColumn';
import { isMobile } from '@/lib/isMobile';
import { paramAsString } from '@/lib/paramHelpers';
import RelistenAPI from '@/lib/RelistenAPI';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';

export default async function SourcesDaySlot() {
  if (await isMobile()) return null;
  const raw = await getSegmentParams();
  const artistSlug = paramAsString(raw.artistSlug);
  const year = paramAsString(raw.year);
  const month = paramAsString(raw.month);
  const day = paramAsString(raw.day);

  // Fetch show data
  const show = await RelistenAPI.fetchShow(artistSlug, year, createShowDate(year, month, day));

  if (!show) return null;

  return <TapesColumn artistSlug={artistSlug} year={year} month={month} day={day} show={show} />;
}
