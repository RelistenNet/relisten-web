import { loadOnDate } from './load';
import { getCurrentMonthDay } from '@/lib/timezone';
import { simplePluralize } from '@/lib/utils';
import { RawParams } from '@/types/params';
import { format } from 'date-fns';
import { Suspense } from 'react';
import Row from '@/ui/base/Row';
import { artistTodayUrl } from '@/lib/urls';

const TodayInHistoryRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const currentMonthDay = await getCurrentMonthDay();

  return (
    <Row href={artistTodayUrl(artistSlug ?? '')}>
      <div>
        <div>Today In History</div>
        <div className="text-xxs text-foreground-muted">
          {format(currentMonthDay.date, 'MMMM do')}
        </div>
      </div>
      <div className="min-w-[20%] text-right text-xxs text-foreground-muted">
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

  const data = await loadOnDate(artistSlug, Number(month), Number(day));

  return (
    <div className="animate-fade-in">
      <div>{simplePluralize('show', data?.length)}</div>
      <div>
        {simplePluralize(
          'tape',
          data?.reduce((memo, next) => memo + next.tapes, 0)
        )}
      </div>
    </div>
  );
};

export default TodayInHistoryRow;
