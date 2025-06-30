import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import React from 'react';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import RecentTapesColumnWithControls from './RecentTapesColumnWithControls';

const RecentTapesColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const [shows, initialFilters] = await Promise.all([
    RelistenAPI.fetchRecentlyAdded(artistSlug),
    getServerFilters(`/${artistSlug}`),
  ]).catch(() => {
    notFound();
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

export default React.memo(RecentTapesColumn);
