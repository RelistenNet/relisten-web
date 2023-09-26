import sortActiveBands from '../lib/sortActiveBands';
import { durationToHHMMSS, removeLeadingZero, simplePluralize, splitShowDate } from '../lib/utils';

import { RawParams } from '@/app/(main)/(home)/layout';
import React from 'react';
import { API_DOMAIN } from '../lib/constants';
import { ArtistShows } from '../types';
import Column from './Column';
import Flex from './Flex';
import Row from './Row';
import RowHeader from './RowHeader';
import Tag from './Tag';

const fetchShows = async (slug?: string, year?: string): Promise<ArtistShows | undefined> => {
  if (!slug || !year) return undefined;

  const res = await fetch(`${API_DOMAIN}/api/v2/artists/${slug}/years/${year}`);
  const parsed: ArtistShows = await res.json();

  return parsed;
};

const ShowsColumn = async ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const artistShows = await fetchShows(artistSlug, year);

  const tours = {};

  return (
    <Column heading={year ? year : 'Shows'}>
      {artistShows?.shows &&
        artistSlug &&
        sortActiveBands(artistSlug, artistShows.shows).map((show) => {
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
                activeSegments={{
                  0: month,
                  1: day,
                }}
                height={48}
              >
                <div>
                  <Flex>
                    {removeLeadingZero(month)}/{day}
                    {show.has_soundboard_source && <Tag>SBD</Tag>}
                  </Flex>
                  {venue && (
                    <div className="text-xxs text-[#979797]">
                      <div>{venue.name}</div>
                      <div>{venue.location}</div>
                    </div>
                  )}
                </div>
                <div className="flex h-full min-w-[20%] flex-col justify-center gap-2 text-right text-xxs text-[#979797]">
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
