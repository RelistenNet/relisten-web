import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';

import { RawParams } from '@/app/(main)/(home)/layout';
import { fetchArtists } from '@/app/queries';
import ky from 'ky';
import { API_DOMAIN } from '../lib/constants';
import { Year } from '../types';
import Column from './Column';
import Row from './Row';

const fetchYears = async (slug?: string) => {
  if (!slug) return [];

  const parsed = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years`).json();

  return parsed;
};

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const year = '';
  const [artists, artistYears]: any = await Promise.all([fetchArtists(), fetchYears(artistSlug)]);

  const artist = artists?.data?.find((artist) => artist.slug === artistSlug);

  return (
    <Column
      heading={artist?.name ?? 'Years'}
      loading={artistYears && artistYears.meta && artistYears.meta.loading}
      loadingAmount={12}
    >
      {artistSlug &&
        artistYears &&
        sortActiveBands(artistSlug, artistYears).map((yearObj: Year) => (
          <Row
            key={yearObj.id}
            href={`/${artistSlug}/${yearObj.year}`}
            activeSegments={{ 0: yearObj.year }}
          >
            <div>
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
