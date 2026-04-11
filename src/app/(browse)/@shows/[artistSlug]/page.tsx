import ShowsColumn from '@/components/ShowsColumn';
import { isMobile } from '@/lib/isMobile';
import RelistenAPI from '@/lib/RelistenAPI';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function ShowsDaySlot() {
  if (await isMobile()) return null;

  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  if (!artistSlug) return null;

  const show = await RelistenAPI.fetchRandomShow(artistSlug);

  if (!show) return null;

  const { year } = splitShowDate(show.display_date);

  return <ShowsColumn artistSlug={artistSlug} year={year} />;
}
