import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import ArtistsColumnWithControls from './ArtistsColumnWithControls';
import { getServerFavorites } from '@/lib/serverFavoriteCookies';

const ArtistsColumn = async () => {
  const [artists, initialFilters, initialFavorites] = await Promise.all([
    RelistenAPI.fetchArtists(),
    getServerFilters('root', true),
    getServerFavorites(),
  ]);

  return (
    <ArtistsColumnWithControls
      artists={artists}
      initialFilters={initialFilters}
      initialFavorites={initialFavorites}
    />
  );
};

export default ArtistsColumn;
