import BrowseColumn from '@/features/browse/BrowseColumn';
import RandomShowColumns from '@/features/browse/RandomShowColumns';
import YearsColumn from '@/features/browse/YearsColumn';
import { DEFAULT_ARTIST_SLUG } from '@/lib/defaultArtist';

// The browse root (/) browses the default artist.
export default function HomePage() {
  return (
    <>
      <BrowseColumn>
        <YearsColumn artistSlug={DEFAULT_ARTIST_SLUG} />
      </BrowseColumn>
      <RandomShowColumns artistSlug={DEFAULT_ARTIST_SLUG} />
    </>
  );
}
