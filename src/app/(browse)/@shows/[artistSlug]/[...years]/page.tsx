import ShowsColumn from '@/components/ShowsColumn';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function ShowsDaySlot() {
  const { artistSlug, years } = getSegmentParams(SEGMENT_PATH);
  return <ShowsColumn artistSlug={artistSlug} year={years[0]} />;
}
