import RelistenAPI from '@/lib/RelistenAPI';
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
  const allArtists = await RelistenAPI.fetchAllArtists();

  return <ArtistsSelectionTab artistsAll={slim(allArtists)} />;
};

export default ArtistsColumn;
