import RelistenAPI from '@/lib/RelistenAPI';
import { notFound } from 'next/navigation';
import { getServerFilters } from '@/lib/serverFilterCookies';
import React from 'react';
import TodayInHistoryColumn from './TodayInHistoryColumn';
import RecentTapesColumn from './RecentTapesColumn';
import ShowsColumnWithControls from './ShowsColumnWithControls';

interface ShowsColumnProps {
  artistSlug: string;
  year?: string;
  venueId?: string;
}

const ShowsColumn = async ({ artistSlug, year, venueId }: ShowsColumnProps) => {
  const fetchShows = year ? RelistenAPI.fetchYearShows : RelistenAPI.fetchVenueShows;
  const fetchParam = year ? year : venueId;

  if (year === 'today-in-history') return <TodayInHistoryColumn artistSlug={artistSlug} />;
  if (year === 'recently-added') return <RecentTapesColumn artistSlug={artistSlug} />;

  const [artistShows, initialFilters] = await Promise.all([
    fetchShows(artistSlug, fetchParam),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    notFound();
  });

  return (
    <ShowsColumnWithControls
      artistSlug={artistSlug}
      year={year}
      venueId={venueId}
      shows={artistShows?.shows || []}
      initialFilters={initialFilters}
    />
  );
};

export default React.memo(ShowsColumn);
