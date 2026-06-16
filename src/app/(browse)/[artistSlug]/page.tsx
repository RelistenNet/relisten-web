import RelistenAPI from '@/lib/RelistenAPI';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

export default function Page() {
  return null;
}

export const metadata = async () => {
  const params = getSegmentParams(SEGMENT_PATH);
  const artistSlug = params?.artistSlug as string | undefined;
  if (!artistSlug) return {};

  const artists = await RelistenAPI.fetchArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return {};

  return {
    title: name,
  };
};
