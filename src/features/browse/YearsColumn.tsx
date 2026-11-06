import { loadArtists, loadYears } from './load';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import YearsColumnWithControls from './YearsColumnWithControls';
import TodayInHistoryRow from './TodayInHistoryRow';
import RowHeader from '@/components/RowHeader';

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const artists = await loadArtists().catch(() => {
    deny(404);
  });

  const artist = artists?.find((artist) => artist.slug === artistSlug);
  const artistYears = await (artist ? loadYears(artist.id) : []);

  // Trim year objects to only what the UI reads. Drops duration,
  // avg_duration, avg_rating, artist_id, created_at, updated_at.
  const slimYears = (artistYears || []).map((y) => ({
    id: y.id,
    year: y.year,
    show_count: y.show_count,
    source_count: y.source_count,
    popularity: y.popularity,
  }));

  return (
    <YearsColumnWithControls
      artistSlug={artistSlug}
      artistName={artist?.name}
      artistYears={slimYears}
    >
      <TodayInHistoryRow key="today" artistSlug={artistSlug} />
      <RowHeader key="years-header">Years</RowHeader>
    </YearsColumnWithControls>
  );
};

export default YearsColumn;
