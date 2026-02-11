import RelistenAPI from '@/lib/RelistenAPI';
import { getServerFilters } from '@/lib/serverFilterCookies';
import { RawParams } from '@/types/params';
import { notFound } from 'next/navigation';
import TodayInHistoryColumnWithControls from './TodayInHistoryColumnWithControls';

const TodayInHistoryColumn = async ({
  artistSlug,
  year,
  month,
  day,
}: Pick<RawParams, 'artistSlug' | 'year'> & { month: string; day: string }) => {
  const [shows, initialFilters] = await Promise.all([
    RelistenAPI.fetchTodayInHistory(artistSlug, month, day),
    getServerFilters(`${artistSlug}:shows`, true),
  ]).catch(() => {
    notFound();
  });

  return (
    <TodayInHistoryColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={shows}
      initialFilters={initialFilters}
      month={month}
      day={day}
    />
  );
};

export default TodayInHistoryColumn;
