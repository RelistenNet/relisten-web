import YearsColumn from '@/components/YearsColumn';
import { rawSegmentParams } from '@timber-js/app/server';

export default async function YearsArtistSlot() {
  const params = await rawSegmentParams();
  const artistSlug = (params.artistSlug as string) ?? 'grateful-dead';

  return <YearsColumn artistSlug={artistSlug} />;
}
