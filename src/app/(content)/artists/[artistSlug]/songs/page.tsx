import SongsIndex, { songsIndexMetadata } from '@/features/songs-index/SongsIndex';
import { getSegmentParams } from '@timber-js/app/server';
import { requireArtistSection } from '@/lib/requireArtistSection';
import { SEGMENT_PATH } from './$segment';

export default async function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  await requireArtistSection(artistSlug, 'songs');
  return <SongsIndex artistSlug={artistSlug} />;
}

export const metadata = () => songsIndexMetadata(getSegmentParams(SEGMENT_PATH));
