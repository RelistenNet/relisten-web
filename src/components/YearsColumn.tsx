import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';

import { RawParams } from '@/app/(main)/(home)/layout';
import { fetchArtists } from '@/app/queries';
import { API_DOMAIN } from '../lib/constants';
import { Year } from '../types';
import Column from './Column';
import Row from './Row';
import { notFound } from 'next/navigation';

const fetchYears = async (slug?: string): Promise<Year[]> => {
  if (!slug) return [];

  try {
    const res = await fetch(`${API_DOMAIN}/api/v2/artists/${slug}/years`);
    const parsed = await res.json();
    return parsed;
  } catch (err) {
    console.error('fetch years error', err);
    notFound();
  }
};

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const [artists, artistYears] = await Promise.all([fetchArtists(), fetchYears(artistSlug)]);

  const artist = artists?.find((artist) => artist.slug === artistSlug);

  return (
    <Column heading={artist?.name ?? 'Years'} loadingAmount={12}>
      {artistSlug &&
        artistYears.length &&
        sortActiveBands(artistSlug, artistYears).map((yearObj) => (
          <Row
            key={yearObj.id}
            href={`/${artistSlug}/${yearObj.year}`}
            activeSegments={{ 0: yearObj.year }}
          >
            <div>
              <div>{yearObj.year}</div>
            </div>
            <div className="min-w-[20%] text-right text-xxs text-[#979797]">
              <div>{simplePluralize('show', yearObj.show_count)}</div>
              <div>{simplePluralize('tape', yearObj.source_count)}</div>
            </div>
          </Row>
        ))}
    </Column>
  );
};

export default YearsColumn;
