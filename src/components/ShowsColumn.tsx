import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import React from 'react';
import TodayInHistoryColumn from './TodayInHistoryColumn';
import RecentTapesColumn from './RecentTapesColumn';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const ShowsColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  if (year === 'today-in-history') return <TodayInHistoryColumn artistSlug={artistSlug} />;
  if (year === 'recently-added') return <RecentTapesColumn artistSlug={artistSlug} />;

  const [artistShows, initialFilters] = await Promise.all([
    RelistenAPI.fetchShows(artistSlug, year),
    getServerFilters(`/${artistSlug}`),
  ]).catch(() => {
    notFound();
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={artistShows?.shows || []}
      initialFilters={initialFilters}
    />
  );
};

export default React.memo(ShowsColumn);
