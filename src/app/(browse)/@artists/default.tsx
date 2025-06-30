import ArtistsColumn from '@/components/ArtistsColumn';
import { getIsInIframe } from '@/lib/isInIframe';

export default async function ArtistsSlot() {
  if (await getIsInIframe()) {
    return null;
  }

  return <ArtistsColumn />;
}
