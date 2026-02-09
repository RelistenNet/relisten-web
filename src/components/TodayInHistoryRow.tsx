import RelistenAPI from '@/lib/RelistenAPI';
import { getCurrentMonthDay } from '@/lib/timezone';
import { simplePluralize } from '@/lib/utils';
import { RawParams } from '@/types/params';
import { format } from 'date-fns';
import { Suspense } from 'react';
import Row from './Row';

const TodayInHistoryRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const currentMonthDay = await getCurrentMonthDay();

  return (
    <Row href={`/${artistSlug}/today-in-history`} activeSegments={{ year: 'today-in-history' }}>
      <div>
        <div>Today In History</div>
        <div className="text-xxs text-foreground-muted">
          {format(currentMonthDay.date, 'MMMM do')}
        </div>
      </div>
      <div className="text-xxs text-foreground-muted min-w-[20%] text-right">
        <Suspense fallback={null}>
          <TodayMetadata
            artistSlug={artistSlug}
            month={currentMonthDay.month}
            day={currentMonthDay.day}
          />
        </Suspense>
      </div>
    </Row>
  );
};

const TodayMetadata = async ({
  artistSlug,
  month,
  day,
}: {
  artistSlug?: string;
  month: string;
  day: string;
}) => {
  if (!artistSlug) return null;

  const data = await RelistenAPI.fetchTodayInHistory(artistSlug, month, day);

  return (
    <>
      <div>{simplePluralize('show', data?.length)}</div>
      <div>
        {simplePluralize(
          'tape',
          data?.reduce((memo, next) => memo + (next.source_count ?? 0), 0)
        )}
      </div>
    </>
  );
};

export default TodayInHistoryRow;
