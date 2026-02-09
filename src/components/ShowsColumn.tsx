import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import React from 'react';
import TodayInHistoryColumn from './TodayInHistoryColumn';
import RecentTapesColumn from './RecentTapesColumn';
import TopTapesColumn from './TopTapesColumn';
import ShowsColumnWithControls from './ShowsColumnWithControls';

const ShowsColumn = async ({
  artistSlug,
  year,
  month,
  day,
}: Pick<RawParams, 'artistSlug' | 'year'> & { month?: string; day?: string }) => {
  if (year === 'today-in-history' && month && day)
    return <TodayInHistoryColumn artistSlug={artistSlug} month={month} day={day} />;
  if (year === 'recently-added') return <RecentTapesColumn artistSlug={artistSlug} />;
  if (year === 'top') return <TopTapesColumn artistSlug={artistSlug} />;

  const [artists, initialFilters] = await Promise.all([
    RelistenAPI.fetchArtists(),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    notFound();
  });

  const artist = artists?.find((a) => a.slug === artistSlug);
  const artistYears = await RelistenAPI.fetchYears(artist?.uuid);
  const yearObj = artistYears?.find((y) => y.year === year);
  const artistShows = await RelistenAPI.fetchShows(artist?.uuid, yearObj?.uuid);

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
