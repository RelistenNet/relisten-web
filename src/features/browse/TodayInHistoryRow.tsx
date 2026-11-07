import { href } from '@timber-js/app/routes';
import { loadOnDate } from './load';
import { getCurrentMonthDay } from '@/lib/timezone';
import { simplePluralize } from '@/lib/utils';
import { format } from 'date-fns';
import { Suspense } from 'react';
import Row from '@/ui/base/Row';

const TodayInHistoryRow = async ({ artistSlug }: { artistSlug?: string }) => {
  const currentMonthDay = await getCurrentMonthDay();

  return (
    <Row href={href('/artists/[artistSlug]/today-in-history', { artistSlug: artistSlug ?? '' })}>
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
