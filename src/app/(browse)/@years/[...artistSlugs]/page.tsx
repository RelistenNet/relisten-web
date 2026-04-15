import YearsColumn from '@/components/YearsColumn';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default async function YearsArtistSlot() {
  const { artistSlugs } = getSegmentParams(SEGMENT_PATH);

  const slug = artistSlugs?.[0] ?? 'grateful-dead';

  return <YearsColumn artistSlug={slug} />;
}
