import { getArtistColumnRows } from '@/lib/artistColumnRows';
import ArtistsSelectionTab from './ArtistsSelectionTab';

const ArtistsColumn = async () => {
  const { primary } = await getArtistColumnRows();

  // Only primary artists ship with the page. The much longer archive list is
  // fetched by the client from /api/artists/archive, so it isn't serialized
  // into every page's RSC payload.
  return <ArtistsSelectionTab primary={primary} />;
};

export default ArtistsColumn;
