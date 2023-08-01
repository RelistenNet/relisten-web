'use client';

import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';

import { RawParams } from '@/app/(main)/(home)/layout';
import { useSuspenseQuery } from '@tanstack/react-query';
import ky from 'ky';
import { useSelectedLayoutSegment } from 'next/navigation';
import React from 'react';
import { API_DOMAIN } from '../lib/constants';
import { Year } from '../types';
import { useArtists } from './ArtistsColumn';
import Column from './Column';
import Row from './Row';

const fetchYears = async (slug?: string) => {
  if (!slug) return [];

  const parsed = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years`).json();

  return parsed;
};

const YearsColumn = ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const year = useSelectedLayoutSegment();
  const artists: any = useArtists();
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

export default React.memo(YearsColumn);
