import YearsColumn from '@/components/YearsColumn';
import { getSegmentParams } from '@timber-js/app/server';

export default async function YearsArtistSlot() {
  const params = await getSegmentParams();
  const artistSlug = (params.artistSlug as string) ?? 'grateful-dead';

  return <YearsColumn artistSlug={artistSlug} />;
}
