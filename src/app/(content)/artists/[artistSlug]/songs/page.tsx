import SongsIndex, { songsIndexMetadata } from '@/features/songs-index/SongsIndex';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <SongsIndex artistSlug={artistSlug} />;
}

export const metadata = () => songsIndexMetadata(getSegmentParams(SEGMENT_PATH));
