import { loadRandomShow } from '@/features/browse/load';
import ShowsColumn from '@/features/browse/ShowsColumn';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function ShowsDaySlot() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  if (!artistSlug) return null;

  const show = await loadRandomShow(artistSlug);

  if (!show) return null;

  const { year } = splitShowDate(show.display_date);

  return <ShowsColumn artistSlug={artistSlug} year={year} />;
}
