import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import ArtistsColumnWithControls from './ArtistsColumnWithControls';

const ArtistsColumn = async () => {
  const [artists, initialFilters] = await Promise.all([
    RelistenAPI.fetchArtists(),
    getServerFilters('root', true),
  ]);

  return <ArtistsColumnWithControls artists={artists} initialFilters={initialFilters} />;
};

export default ArtistsColumn;
