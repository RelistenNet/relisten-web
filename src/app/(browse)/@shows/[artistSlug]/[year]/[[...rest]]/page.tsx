import ShowsColumn from '@/features/browse/ShowsColumn';
import { getSegmentParams, type PageOptions } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export const pageOptions = {
  lifetime: 'document',
  key: { segmentParams: ['artistSlug', 'year'] },
} satisfies PageOptions;

export default async function ShowsDaySlot() {
  const { artistSlug, year } = getSegmentParams(SEGMENT_PATH);
  return <ShowsColumn artistSlug={artistSlug} year={year} />;
}
