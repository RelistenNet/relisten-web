import YearsColumn from '@/components/YearsColumn';
import { isMobile } from '@/lib/isMobile';

export default async function YearsArtistSlot() {
  if (await isMobile()) return null;

  const artistSlug = 'grateful-dead';

  return <YearsColumn artistSlug={artistSlug} />;
}
