import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import { getServerFilters } from '@/lib/serverFilterCookies';
import YearsColumnWithControls from './YearsColumnWithControls';
import SubartistTabs from './SubartistTabs';
import TodayInHistoryRow from './TodayInHistoryRow';
import RowHeader from './RowHeader';

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const [artists, initialFilters] = await Promise.all([
    RelistenAPI.fetchArtists(),
    getServerFilters(artistSlug || '', true),
  ]).catch(() => {
    deny(404);
  });

  const artist = artists?.find((artist) => artist.slug === artistSlug);
  const artistYears = await RelistenAPI.fetchYears(artist?.uuid);
  const features = artist?.features;

  // Trim year objects to only what the UI reads. Drops duration,
  // avg_duration, avg_rating, artist_uuid, created_at, updated_at.
  const slimYears = (artistYears || []).map((y) => ({
    id: y.id,
    uuid: y.uuid,
    year: y.year,
    show_count: y.show_count,
    source_count: y.source_count,
    has_soundboard_source: y.has_soundboard_source,
    popularity: y.popularity,
  }));

  return (
    <YearsColumnWithControls
      artistSlug={artistSlug}
      artistName={artist?.name}
      artistYears={slimYears}
      initialFilters={initialFilters}
    >
      <SubartistTabs artistSlug={artistSlug} features={features} />
      <TodayInHistoryRow artistSlug={artistSlug} />
      <RowHeader>Years</RowHeader>
    </YearsColumnWithControls>
  );
};

export default YearsColumn;
