import { loadRandomShow } from '@/features/browse/load';
import TapesColumn from '@/features/browse/TapesColumn';
import { tapesProjection } from '@/lib/showProjection';
import { splitShowDate } from '@/lib/utils';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function SourcesDaySlot() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);

  // Fetch show data
  const show = await loadRandomShow(artistSlug);

  if (!show) return null;

  const { year, month, day } = splitShowDate(show.date);

  return (
    <TapesColumn
      artistSlug={artistSlug}
      year={year}
      month={month}
      day={day}
      show={tapesProjection(show)}
    />
  );
}
