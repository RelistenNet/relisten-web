import { loadShow } from '@/features/browse/load';
import TapesColumn from '@/features/browse/TapesColumn';
import { tapesProjection } from '@/lib/showProjection';
import { createShowDate } from '@/lib/utils';
import { getSegmentParams, type PageOptions } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// A show's column depends only on the date: switching tapes (`?source=`) is
// picked client-side, so a tape switch skips this slot without rendering it.
export const pageOptions = {
  lifetime: 'document',
  key: { segmentParams: ['artistSlug', 'year', 'month', 'days'] },
} satisfies PageOptions;

export default async function SourcesDaySlot() {
  const { artistSlug, year, month, days } = getSegmentParams(SEGMENT_PATH);

  const show = await loadShow(artistSlug, createShowDate(year, month, days[0]));

  if (!show) return null;

  return (
    <TapesColumn
      artistSlug={artistSlug}
      year={year}
      month={month}
      day={days[0]}
      show={tapesProjection(show)}
    />
  );
}
