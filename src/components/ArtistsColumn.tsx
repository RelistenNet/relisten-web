'use client';

import { useQuery } from '@tanstack/react-query';
import ky from 'ky';
import { usePathname } from 'next/navigation';
import { API_DOMAIN } from '../lib/constants';
import { groupBy, simplePluralize } from '../lib/utils';
import { Artist } from '../types';
import Column from './Column';
import Row from './Row';
import RowHeader from './RowHeader';

const byObject = {
  wsp: 'PanicStream',
  phish: 'Phish.in',
};

const fetchArtists = async () => {
  const parsed = await ky(`${API_DOMAIN}/api/v2/artists`).json();

  return parsed;
};

const ArtistsColumn = () => {
  const artistSlug = usePathname()
    ?.split('/')
    .filter((x) => x)[0];

  const artists: any = useQuery({
    queryKey: ['artists'],
    queryFn: () => fetchArtists(),
    cacheTime: Infinity,
    staleTime: Infinity,
  });

  return (
    <Column heading="Bands">
      {artists?.data &&
        Object.entries(groupBy(Object.values(artists.data), 'featured'))
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([type, artists]: [string, Artist[]]) => [
            <RowHeader key={`header-${type}`}>{type === '1' ? 'Featured' : 'Bands'}</RowHeader>,
            ...artists.map((artist: Artist, idx: number) => (
              <Row
                key={[idx, artist.id].join(':')}
                href={`/${artist.slug}`}
                active={artist.slug === artistSlug}
              >
                <div className={artist.slug === artistSlug ? 'pl-2' : ''}>
                  {artist.name}
                  {byObject[artist.slug] && (
                    <span className="text-[0.7em] text-[#979797]">
                      Powered by {byObject[artist.slug]}
                    </span>
                  )}
                </div>
                <div className="min-w-[20%] text-right text-[0.7em] text-[#979797]">
                  <div>{simplePluralize('show', artist.show_count)}</div>
                  <div>{simplePluralize('tape', artist.source_count)}</div>
                </div>
              </Row>
            )),
          ])}
    </Column>
  );
};

export default ArtistsColumn;
