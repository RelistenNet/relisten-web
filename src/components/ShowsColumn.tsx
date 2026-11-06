import RelistenAPI from '@/lib/RelistenAPI';
import { slimShows } from '@/lib/slimShow';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const ShowsColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const artists = await RelistenAPI.fetchAllArtists().catch(() => {
    deny(404);
  });

  const artist = artists?.find((a) => a.slug === artistSlug);
  const artistShows = await RelistenAPI.fetchYearShows(artist?.id, year);

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={slimShows(artistShows?.shows)}
    />
  );
};

export default ShowsColumn;
