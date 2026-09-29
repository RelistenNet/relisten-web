import YearsColumn from '@/components/YearsColumn';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function YearsDefaultSlot() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  if (!artistSlug) return null;

  return <YearsColumn artistSlug={artistSlug} />;
}
