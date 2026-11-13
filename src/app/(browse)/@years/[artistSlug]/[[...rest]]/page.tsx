import YearsColumn from '@/features/browse/YearsColumn';
import { getSegmentParams, type PageOptions } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export const pageOptions = {
  lifetime: 'document',
  key: { segmentParams: ['artistSlug'] },
} satisfies PageOptions;

export default async function YearsDefaultSlot() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  if (!artistSlug) return null;

  return <YearsColumn artistSlug={artistSlug} />;
}
