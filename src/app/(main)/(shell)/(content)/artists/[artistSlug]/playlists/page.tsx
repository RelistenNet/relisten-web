import PublicPlaylistsIndex, {
  publicPlaylistsIndexMetadata,
} from '@/features/playlist/PublicPlaylistsIndex';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <PublicPlaylistsIndex artistSlug={artistSlug} />;
}

export const metadata = () => publicPlaylistsIndexMetadata(getSegmentParams(SEGMENT_PATH));
