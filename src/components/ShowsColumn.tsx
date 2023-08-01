'use client';

import sortActiveBands from '../lib/sortActiveBands';
import { durationToHHMMSS, removeLeadingZero, simplePluralize, splitShowDate } from '../lib/utils';

import { useSuspenseQuery } from '@tanstack/react-query';
import ky from 'ky';
import React from 'react';
import { API_DOMAIN } from '../lib/constants';
import { Show } from '../types';
import Column from './Column';
import Flex from './Flex';
import Row from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';

const fetchShows = async (slug?: string, year?: string) => {
  if (!slug || !year) return [];

  const parsed = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years/${year}`).json();

  return parsed;
};

const ShowsColumn = ({
  artistSlug,
  year,
  month,
  day,
}: Pick<RawParams, 'artistSlug' | 'year' | 'month' | 'day'>) => {
  const artistShows: any = useSuspenseQuery({
    queryKey: ['artists', artistSlug, year],
    queryFn: () => fetchShows(artistSlug!, year),
  });

  const displayDate = [year, month, day].join('-');

  const tours = {};

  return (
    <Column
      heading={year ? year : 'Shows'}
      loading={displayDate && !artistShows ? true : artistShows.meta && artistShows.meta.loading}
      loadingAmount={12}
    >
      {artistShows?.data?.shows &&
        sortActiveBands(artistSlug, artistShows.data.shows).map((show: Show) => {
          const { year, month, day } = splitShowDate(show.display_date);
          const { venue, avg_duration, tour } = show;
          let tourName = '';

          // keep track of which tours we've displayed
          if (tour) {
            if (!tours[tour.id]) tourName = tour.name ?? '';

            tours[tour.id] = true;
          }

          return (
            <div key={show.id}>
              {tourName && (
                <RowHeader>{tourName === 'Not Part of a Tour' ? '' : tourName}</RowHeader>
              )}
              <Row
                href={`/${artistSlug}/${year}/${month}/${day}`}
                active={displayDate === show.display_date}
                height={48}
              >
                <div className={displayDate === show.display_date ? 'pl-2' : ''}>
                  <Flex>
                    {removeLeadingZero(month)}/{day}
                    {show.has_soundboard_source && <Tag>SBD</Tag>}
                  </Flex>
                  {venue && (
                    <div className="text-[0.7em] text-[#979797]">
                      <div>{venue.name}</div>
                      <div>{venue.location}</div>
                    </div>
                  )}
                </div>
                <div className="min-w-[20%] text-right text-[0.7em] text-[#979797]">
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

export default React.memo(ShowsColumn);
