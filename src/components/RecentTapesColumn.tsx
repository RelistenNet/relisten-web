import sortActiveBands from '../lib/sortActiveBands';
import { durationToHHMMSS, removeLeadingZero, simplePluralize, splitShowDate } from '../lib/utils';

import RelistenAPI from '@/lib/RelistenAPI';
import { RawParams } from '@/types/params';
import React from 'react';
import Column from './Column';
import Flex from './Flex';
import Row from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';
import { notFound } from 'next/navigation';

const RecentTapesColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const shows = await RelistenAPI.fetchRecentlyAdded(artistSlug).catch(() => {
    notFound();
  });
  const tours = {};
  return (
    <Column heading={year ? year : 'Recently Added'} key={year}>
      {(!shows || shows.length === 0) && (
        <div className="text-center text-gray-700 text-sm py-2">No recently added shows!</div>
      )}
      {shows &&
        artistSlug &&
        sortActiveBands(artistSlug, shows).map((show) => {
          const { year, month, day } = splitShowDate(show.display_date);
          const { venue, avg_duration } = show;

          return (
            <div key={show.id}>
              <Row
                href={`/${artistSlug}/${year}/${month}/${day}`}
                activeSegments={{
                  month,
                  day,
                }}
              >
                <div>
                  <Flex>
                    {removeLeadingZero(month)}/{day}/{year}
                    {show.has_soundboard_source && <Tag>SBD</Tag>}
                  </Flex>
                  {venue && (
                    <div className="text-xxs text-foreground-muted">
                      <div>{venue.name}</div>
                      <div>{venue.location}</div>
                    </div>
                  )}
                </div>
                <div className="flex h-full min-w-[20%] flex-col justify-center gap-2 text-right text-xxs text-foreground-muted">
                  <div>{durationToHHMMSS(avg_duration)}</div>
                  <div>{simplePluralize('tape', show.source_count)}</div>
                </div>
              </Row>
            </div>
          );
        })}
    </Column>
  );
};

export default React.memo(RecentTapesColumn);
