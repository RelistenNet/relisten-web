import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import YearsColumnWithControls from './YearsColumnWithControls';
import TodayInHistoryRow from './TodayInHistoryRow';
import RecentTapesRow from './RecentTapesRow';

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const [artists, artistYears, initialFilters] = await Promise.all([
    RelistenAPI.fetchArtists(),
    RelistenAPI.fetchYears(artistSlug),
    getServerFilters(artistSlug || '', true),
  ]).catch(() => {
    notFound();
  });

  const artist = artists?.find((artist) => artist.slug === artistSlug);

  return (
    <YearsColumnWithControls
      artistSlug={artistSlug}
      artistName={artist?.name}
      artistYears={artistYears}
      initialFilters={initialFilters}
    >
      <TodayInHistoryRow artistSlug={artistSlug} />
      <RecentTapesRow artistSlug={artistSlug} />
    </YearsColumnWithControls>
  );
};

export default YearsColumn;
