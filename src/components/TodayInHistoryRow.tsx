import { RawParams } from '@/app/(main)/(home)/layout';
import Row from './Row';
import { fetchToday } from './TodayInHistoryColumn';
import { simplePluralize } from '@/lib/utils';
import { Suspense } from 'react';
import { getCurrentMonthDay } from '@/lib/timezone';
import { format } from 'date-fns';

const TodayInHistoryRow = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const currentMonthDay = await getCurrentMonthDay();

  return (
    <Row href={`/${artistSlug}/today-in-history`} activeSegments={{ 0: 'today-in-history' }}>
      <div>
        <div>Today In History</div>
        <div className="text-xxs text-[#979797]">{format(currentMonthDay.date, 'MMMM do')}</div>
      </div>
      <div className="min-w-[20%] text-right text-xxs text-[#979797]">
        <Suspense fallback={null}>
          <TodayMetadata artistSlug={artistSlug} />
        </Suspense>
      </div>
    </Row>
  );
};

const TodayMetadata = async ({ artistSlug }: { artistSlug?: string }) => {
  if (!artistSlug) return null;

  const data = await fetchToday(artistSlug);

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
