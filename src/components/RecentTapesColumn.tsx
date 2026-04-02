import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import RecentTapesColumnWithControls from './RecentTapesColumnWithControls';

const RecentTapesColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const [shows, initialFilters] = await Promise.all([
    RelistenAPI.fetchRecentlyAdded(artistSlug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    deny(404);
  });

  return (
    <RecentTapesColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={shows}
      initialFilters={initialFilters}
    />
  );
};

export default RecentTapesColumn;
