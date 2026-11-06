import { loadShow } from '@/features/browse/load';
import TapesColumn from '@/features/browse/TapesColumn';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function SourcesDaySlot() {
  const { artistSlug, year, month, days } = getSegmentParams(SEGMENT_PATH);

  const show = await loadShow(artistSlug, createShowDate(year, month, days[0]));

  if (!show) return null;

  return (
    <TapesColumn artistSlug={artistSlug} year={year} month={month} day={days[0]} show={show} />
  );
}
