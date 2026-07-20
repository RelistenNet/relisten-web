import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import type { ReactNode } from 'react';
import { deny } from '@timber-js/app/server';
import RecentTapesColumnWithControls from './RecentTapesColumnWithControls';

const RecentTapesColumn = async ({ artistSlug, year, subHeader }: Pick<RawParams, 'artistSlug' | 'year'> & { subHeader?: ReactNode }) => {
  const shows = await RelistenAPI.fetchRecentlyAdded(artistSlug).catch(() => {
    deny(404);
  });

  return (
    <RecentTapesColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={shows}
      subHeader={subHeader}
    />
  );
};

export default RecentTapesColumn;
