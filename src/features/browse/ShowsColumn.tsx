import { loadArtist, loadYearShows } from './load';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import type { ShowSummary } from '@/domain/types';
import ShowsColumnWithControls, { type BrowseShow } from './ShowsColumnWithControls';

const browseShow = (s: ShowSummary): BrowseShow => ({
  id: s.id,
  date: s.date,
  tourName: s.tourName,
  tapes: s.tapes,
  sbd: s.sbd,
  avgDuration: s.avgDuration,
  popularity: s.popularity,
  venue: s.venue ? { name: s.venue.name, location: s.venue.location } : undefined,
});

const ShowsColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const artist = await loadArtist(artistSlug);
  if (!artist) deny(404);
  const artistShows = year ? await loadYearShows(artist.id, year) : undefined;

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={(artistShows ?? []).map(browseShow)}
    />
  );
};

export default ShowsColumn;
