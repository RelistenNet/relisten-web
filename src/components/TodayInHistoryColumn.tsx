import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import { deny } from '@timber-js/app/server';
import TodayInHistoryColumnWithControls from './TodayInHistoryColumnWithControls';

const TodayInHistoryColumn = async ({
  artistSlug,
  year,
  month,
  day,
}: Pick<RawParams, 'artistSlug' | 'year'> & { month: string; day: string }) => {
  const shows = await RelistenAPI.fetchTodayInHistory(artistSlug, month, day).catch(() => {
    deny(404);
  });

  return (
    <TodayInHistoryColumnWithControls
      artistSlug={artistSlug}
      year={year}
      shows={shows}
      month={month}
      day={day}
    />
  );
};

export default TodayInHistoryColumn;
