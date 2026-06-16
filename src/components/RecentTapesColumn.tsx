import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { RawParams } from '@/types/params';
import type { ReactNode } from 'react';
import { deny } from '@timber-js/app/server';
import RecentTapesColumnWithControls from './RecentTapesColumnWithControls';

const RecentTapesColumn = async ({ artistSlug, year, subHeader }: Pick<RawParams, 'artistSlug' | 'year'> & { subHeader?: ReactNode }) => {
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
      subHeader={subHeader}
    />
  );
};

export default RecentTapesColumn;
