import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import TopTapesColumnWithControls from './TopTapesColumnWithControls';

const TopTapesColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const [shows, initialFilters] = await Promise.all([
    RelistenAPI.fetchTopShows(artistSlug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    deny(404);
  });

  return (
    <TopTapesColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={shows}
      initialFilters={initialFilters}
    />
  );
};

export default TopTapesColumn;
