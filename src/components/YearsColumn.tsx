'use client';

import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import ky from 'ky';
import { RawParams } from '../app/(main)/[[...anything]]/page';
import { API_DOMAIN } from '../lib/constants';
import { Year } from '../types';
import Column from './Column';
import Row from './Row';

const fetchYears = async (slug?: string) => {
  if (!slug) return [];

  const parsed = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years`).json();

  return parsed;
};

const YearsColumn = ({ artistSlug, year }: Pick<RawParams, 'artistSlug' | 'year'>) => {
  const artists: any = useQuery({
    queryKey: ['artists'],
  });
  const artistYears: any = useSuspenseQuery({
    queryKey: ['artists', artistSlug],
    queryFn: () => fetchYears(artistSlug!),
    // enabled: !!artistSlug,
  });

  const artist = artists?.data?.find((artist) => artist.slug === artistSlug);

  return (
    <Column
      heading={artist?.name ?? 'Years'}
      loading={artistYears && artistYears.meta && artistYears.meta.loading}
      loadingAmount={12}
    >
      {artistSlug &&
        artistYears?.data &&
        sortActiveBands(artistSlug, artistYears.data).map((yearObj: Year) => (
          <Row
            key={yearObj.id}
            href={`/${artistSlug}/${yearObj.year}`}
            active={yearObj.year === year}
          >
            <div className={yearObj.year === year ? 'pl-2' : ''}>
              <div>{yearObj.year}</div>
            </div>
            <div className="min-w-[20%] text-right text-[0.7em] text-[#979797]">
              <div>{simplePluralize('show', yearObj.show_count)}</div>
              <div>{simplePluralize('tape', yearObj.source_count)}</div>
            </div>
          </Row>
        ))}
    </Column>
  );
};

export default YearsColumn;
