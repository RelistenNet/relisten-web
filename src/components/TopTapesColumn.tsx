import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import React from 'react';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import TopTapesColumnWithControls from './TopTapesColumnWithControls';

const TopTapesColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const [shows, initialFilters] = await Promise.all([
    RelistenAPI.fetchTopShows(artistSlug),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    notFound();
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

export default React.memo(TopTapesColumn);
