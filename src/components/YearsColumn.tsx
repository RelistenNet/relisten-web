import sortActiveBands from '../lib/sortActiveBands';
import { simplePluralize } from '../lib/utils';

import { RawParams } from '@/app/(main)/(home)/layout';
import { fetchArtists } from '@/app/queries';
import ky from 'ky-universal';
import { API_DOMAIN } from '../lib/constants';
import { Year } from '../types';
import Column from './Column';
import Row from './Row';
import { notFound } from 'next/navigation';
import TodayInHistoryRow from './TodayInHistoryRow';

const fetchYears = async (slug?: string): Promise<Year[]> => {
  if (!slug) return [];

  const parsed = await ky(`${API_DOMAIN}/api/v2/artists/${slug}/years`, {
    cache: 'no-cache',
  })
    .json<Year[]>()
    .catch(() => {
      notFound();

      return [] as Year[];
    });

  return parsed ?? [];
};

const YearsColumn = async ({ artistSlug }: Pick<RawParams, 'artistSlug'>) => {
  const [artists, artistYears] = await Promise.all([fetchArtists(), fetchYears(artistSlug)]).catch(
    () => {
      notFound();
    }
  );

  const artist = artists?.find((artist) => artist.slug === artistSlug);

  return (
    <Column heading={artist?.name ?? 'Years'}>
      <TodayInHistoryRow artistSlug={artistSlug} />
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
