import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import ArtistsColumnWithControls from './ArtistsColumnWithControls';

const ArtistsColumn = async () => {
  const [artists, initialFilters] = await Promise.all([
    RelistenAPI.fetchArtists().then((artists) =>
      artists.filter((artist) => Number(artist.featured) <= 1)
    ),
    getServerFilters('root', true),
  ]);

  // Trim to only the fields the UI needs. The full artist objects include
  // upstream_sources, musicbrainz_id, timestamps, etc. — 357KB of data
  // that the client component never reads. Trimming reduces the RSC
  // payload from 357KB to ~32KB (91% smaller), cutting render time ~3x.
  const slimArtists = artists.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    show_count: a.show_count,
    source_count: a.source_count,
    uuid: a.uuid,
    featured: a.featured,
    popularity: a.popularity,
  }));

  return <ArtistsColumnWithControls artists={slimArtists} initialFilters={initialFilters} />;
};

export default ArtistsColumn;
