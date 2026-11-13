import RandomShowColumns from '@/features/browse/RandomShowColumns';
import { loadArtists } from '@/features/browse/load';
import { getSegmentParams } from '@timber-js/app/server';
import { SEGMENT_PATH } from './$segment';

// /{artist}: a random show of the artist fills the columns after its years.
export default function Page() {
  const { artistSlug } = getSegmentParams(SEGMENT_PATH);
  return <RandomShowColumns artistSlug={artistSlug} />;
}

export const metadata = async () => {
  const params = getSegmentParams(SEGMENT_PATH);
  const artistSlug = params?.artistSlug as string | undefined;
  if (!artistSlug) return {};

  const artists = await loadArtists();
  const name = artists.find((a) => a.slug === artistSlug)?.name;

  if (!name) return {};

  return {
    title: name,
  };
};
