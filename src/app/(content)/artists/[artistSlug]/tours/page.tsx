import Tours, { toursMetadata } from '@/features/artist/Tours';
import { getSegmentParams } from '@timber-js/app/server';
import { requireArtistSection } from '@/lib/requireArtistSection';
import { SEGMENT_PATH } from './$segment';

export default async function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  await requireArtistSection(artistSlug, 'tours');
  return <Tours artistSlug={artistSlug} />;
}

export const metadata = () => toursMetadata(getSegmentParams(SEGMENT_PATH));
