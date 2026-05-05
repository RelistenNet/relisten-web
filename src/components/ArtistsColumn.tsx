import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { Artist } from '@/types';
import ArtistsSelectionTab from './ArtistsSelectionTab';

const slim = (artists: Artist[]) =>
  artists.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    show_count: a.show_count,
    source_count: a.source_count,
    uuid: a.uuid,
    featured: a.featured,
    popularity: a.popularity,
  }));

const ArtistsColumn = async () => {
  const [allArtists, initialFilters] = await Promise.all([
    RelistenAPI.fetchAllArtists(),
    getServerFilters('root', true),
  ]);

  return (
    <ArtistsSelectionTab
      artistsAll={slim(allArtists)}
      initialFilters={initialFilters}
    />
  );
};

export default ArtistsColumn;
