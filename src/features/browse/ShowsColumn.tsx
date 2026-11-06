import { loadArtist, loadYearShows } from './load';
import { slimShows } from '@/lib/slimShow';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const ShowsColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const artist = await loadArtist(artistSlug);
  if (!artist) deny(404);
  const artistShows = year ? await loadYearShows(artist.id, year) : undefined;

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={slimShows(artistShows?.shows)}
    />
  );
};

export default ShowsColumn;
