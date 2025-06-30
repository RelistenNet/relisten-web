import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import React from 'react';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import TodayInHistoryColumnWithControls from './TodayInHistoryColumnWithControls';

const TodayInHistoryColumn = async ({
  artistSlug,
  year,
}: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const [shows, initialFilters] = await Promise.all([
    RelistenAPI.fetchTodayInHistory(artistSlug),
    getServerFilters(`/${artistSlug}`),
  ]).catch(() => {
    notFound();
  });

  return (
    <TodayInHistoryColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={shows}
      initialFilters={initialFilters}
    />
  );
};

export default React.memo(TodayInHistoryColumn);
