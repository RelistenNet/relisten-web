import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import YearsColumnWithControls from './YearsColumnWithControls';
import QuickHitsNav from './QuickHitsNav';
import TodayInHistoryRow from './TodayInHistoryRow';
import RowHeader from './RowHeader';

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const [artists, initialFilters] = await Promise.all([
    RelistenAPI.fetchArtists(),
    getServerFilters(artistSlug || '', true),
  ]).catch(() => {
    notFound();
  });

  const artist = artists?.find((artist) => artist.slug === artistSlug);
  const artistYears = await RelistenAPI.fetchYears(artist?.uuid);
  const features = artist?.features;

  return (
    <YearsColumnWithControls
      artistSlug={artistSlug}
      artistName={artist?.name}
      artistYears={artistYears}
      initialFilters={initialFilters}
    >
      <QuickHitsNav artistSlug={artistSlug} features={features} />
      <TodayInHistoryRow artistSlug={artistSlug} />
      <RowHeader>Years</RowHeader>
    </YearsColumnWithControls>
  );
};

export default YearsColumn;
